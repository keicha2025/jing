import sys
import os
import argparse
from pydub import AudioSegment
from pydub.silence import split_on_silence

def filter_audio(input_path, output_path, threshold=-40, min_silence=2000, keep_silence=1000):
    """
    Filters out silence from an audio file.
    
    :param input_path: Path to the input audio file (m4a, mp3, wav, etc.)
    :param output_path: Path to save the filtered audio
    :param threshold: Silence threshold in dBFS (default -40)
    :param min_silence: Minimum length of silence to be used for splitting in ms (default 2000)
    :param keep_silence: Amount of silence to keep around chunks in ms (default 1000)
    """
    print(f"[*] Loading audio: {input_path}")
    audio = AudioSegment.from_file(input_path)
    
    print(f"[*] Analyzing and splitting based on silence (Threshold: {threshold}dBFS)...")
    # Split audio into non-silent chunks
    chunks = split_on_silence(
        audio,
        min_silence_len=min_silence,
        silence_thresh=threshold,
        keep_silence=keep_silence
    )
    
    if not chunks:
        print("[!] No non-silent parts detected. Check your threshold.")
        return

    print(f"[*] Done. Merging {len(chunks)} non-silent chunks...")
    combined = sum(chunks)
    
    print(f"[*] Exporting filtered audio to: {output_path}")
    combined.export(output_path, format=os.path.splitext(output_path)[1][1:])
    
    original_duration = len(audio) / 1000 / 60
    new_duration = len(combined) / 1000 / 60
    print(f"[+] Success!")
    print(f"    Original Duration: {original_duration:.2f} mins")
    print(f"    Filtered Duration: {new_duration:.2f} mins")
    print(f"    Reduction: {((1 - new_duration/original_duration) * 100):.1f}%")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NightWhisper - Silence Filtering Tool")
    parser.add_argument("input", help="Path to input audio file")
    parser.add_argument("-o", "--output", help="Path to output audio file", default="filtered_output.m4a")
    parser.add_argument("-t", "--threshold", type=int, default=-40, help="Silence threshold in dBFS (default: -40)")
    parser.add_argument("-s", "--silence", type=int, default=2000, help="Min silence length in ms (default: 2000)")
    parser.add_argument("-k", "--keep", type=int, default=1000, help="Keep silence buffer in ms (default: 1000)")

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"[ERROR] File not found: {args.input}")
        sys.exit(1)

    try:
        filter_audio(args.input, args.output, args.threshold, args.silence, args.keep)
    except Exception as e:
        print(f"[ERROR] An error occurred: {e}")
        print("\nNote: Make sure you have 'ffmpeg' installed on your system.")
