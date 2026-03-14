import { useRef, useState, useCallback } from 'react';
import { saveAudioChunk } from '../utils/storage';

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const analyserRef = useRef(null);
    const audioContextRef = useRef(null);
    const timerRef = useRef(null);
    const sessionIdRef = useRef(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            sessionIdRef.current = Date.now().toString();

            // Set up Web Audio for visualization
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;

            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;

            // Use standard webm/opus or check for supported types
            const mimeType = 'audio/webm;codecs=opus';
            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    await saveAudioChunk({
                        sessionId: sessionIdRef.current,
                        blob: event.data,
                        timestamp: Date.now()
                    });
                    console.log('Chunk saved for session:', sessionIdRef.current);
                }
            };

            // Slice every 10 seconds (10000ms)
            mediaRecorder.start(10000);
            setIsRecording(true);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            return sessionIdRef.current;
        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('無法存取麥克風，請檢查權限。');
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

            if (audioContextRef.current) {
                audioContextRef.current.close();
            }

            clearInterval(timerRef.current);
            setIsRecording(false);
            setRecordingTime(0);
            console.log('Recording stopped for session:', sessionIdRef.current);
        }
    }, [isRecording]);

    return {
        isRecording,
        recordingTime,
        analyser: analyserRef.current,
        sessionId: sessionIdRef.current,
        startRecording,
        stopRecording
    };
};
