import { createFile } from 'mp4box';

/**
 * Low-level Audio Stream Decoder using WebCodecs and MP4Box.js
 * Optimized for handling huge M4A files without memory spikes.
 */
export async function analyzeAudioStream(file, aiEngine, onProgress) {
  return new Promise((resolve, reject) => {
    const mp4boxfile = createFile();
    const decoder = new AudioDecoder({
      output: (audioData) => handleDecodedData(audioData),
      error: (e) => {
        console.error('WebCodecs Decoder Error:', e);
        reject(e);
      }
    });

    let audioTrack = null;
    let events = [];
    let samplesProcessed = 0;
    let totalSamples = 0;
    let sampleRate = 0;
    let isFinished = false;

    // To prevent memory buildup, we analyze and close AudioData immediately
    async function handleDecodedData(audioData) {
      // Capture metadata before closing
      const frameCount = audioData.numberOfFrames;
      sampleRate = audioData.sampleRate;
      const timestampMs = audioData.timestamp / 1000;
      
      const buffer = new Float32Array(frameCount);
      // We only take the first channel for AI analysis to save memory
      audioData.copyTo(buffer, { planeIndex: 0 });
      
      // CRITICAL: Close the AudioData immediately after copying to Float32Array
      audioData.close();

      // Send to AI Engine for small chunk analysis
      const detectedEvent = await aiEngine.recognizeChunk(buffer, sampleRate, timestampMs);
      if (detectedEvent) {
        events.push(detectedEvent);
      }

      samplesProcessed += frameCount;
      if (onProgress && totalSamples > 0) {
        onProgress(Math.min(99, Math.round((samplesProcessed / totalSamples) * 100)));
      }
      
      // Check if this was the last expected sample
      if (isFinished && samplesProcessed >= totalSamples) {
         resolve(events);
      }
    }

    mp4boxfile.onReady = (info) => {
      audioTrack = info.audioTracks[0];
      if (!audioTrack) {
        reject(new Error('No audio track found in file'));
        return;
      }

      totalSamples = audioTrack.nb_samples;
      
      // Configure the decoder using track metadata
      const config = {
        codec: audioTrack.codec,
        sampleRate: audioTrack.audio.sample_rate,
        numberOfChannels: audioTrack.audio.channel_count,
        description: getCodecDescription(mp4boxfile, audioTrack)
      };

      console.log('WebCodecs: Configuring decoder with:', config);
      decoder.configure(config);

      // Extract all samples for the audio track
      mp4boxfile.setExtractionOptions(audioTrack.id, null, { nbSamples: 100 });
      mp4boxfile.start();
    };

    mp4boxfile.onSamples = (id, user, samples) => {
      for (const sample of samples) {
        const chunk = new EncodedAudioChunk({
          type: sample.is_sync ? 'key' : 'delta',
          timestamp: sample.cts * 1000000 / sample.timescale,
          duration: sample.duration * 1000000 / sample.timescale,
          data: sample.data
        });
        decoder.decode(chunk);
      }
    };

    mp4boxfile.onFlush = () => {
        isFinished = true;
        decoder.flush().then(() => {
            if (samplesProcessed >= totalSamples || totalSamples === 0) {
                resolve(events);
            }
        });
    };

    // Helper to get codec-specific config (ESDS for AAC)
    function getCodecDescription(file, track) {
      for (const entry of file.moov.traks) {
        if (entry.tkhd.track_id === track.id) {
          return entry.mdia.minf.stbl.stsd.entries[0].esds?.data.buffer;
        }
      }
      return null;
    }

    // Read the file in chunks to MP4Box
    const reader = file.stream().getReader();
    let offset = 0;

    async function push() {
      // BACKPRESSURE: If decoder queue is full, wait before feeding more
      while (decoder.decodeQueueSize > 50) {
        await new Promise(r => setTimeout(r, 100));
      }

      const { done, value } = await reader.read();
      if (done) {
        mp4boxfile.flush();
        return;
      }
      // value is a Uint8Array. We must slice the underlying buffer to get ONLY the new data.
      const buffer = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
      buffer.fileStart = offset;
      offset += buffer.byteLength;
      mp4boxfile.appendBuffer(buffer);
      push();
    }

    push().catch(reject);
  });
}
