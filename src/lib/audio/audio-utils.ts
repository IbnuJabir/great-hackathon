/**
 * Audio utilities for voice recording and processing
 */

export interface AudioRecordingOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  maxDuration?: number; // in milliseconds
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

/**
 * Check if the browser supports MediaRecorder API
 */
export function isRecordingSupported(): boolean {
  return typeof navigator !== "undefined" &&
         typeof navigator.mediaDevices !== "undefined" &&
         typeof MediaRecorder !== "undefined";
}

/**
 * Get supported MIME types for audio recording
 */
export function getSupportedMimeTypes(): string[] {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/wav",
    "audio/ogg;codecs=opus",
    "audio/ogg"
  ];

  return types.filter(type => MediaRecorder.isTypeSupported(type));
}

/**
 * Get the best supported MIME type for recording
 */
export function getBestMimeType(): string {
  const supportedTypes = getSupportedMimeTypes();

  // Prefer WebM with Opus codec for better compression
  if (supportedTypes.includes("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }

  if (supportedTypes.includes("audio/webm")) {
    return "audio/webm";
  }

  // Fallback to the first supported type
  return supportedTypes[0] || "audio/webm";
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    return stream;
  } catch (error) {
    console.error("Error requesting microphone permission:", error);

    if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        throw new Error("Microphone permission denied. Please allow microphone access and try again.");
      } else if (error.name === "NotFoundError") {
        throw new Error("No microphone found. Please connect a microphone and try again.");
      } else if (error.name === "NotReadableError") {
        throw new Error("Microphone is already in use by another application.");
      }
    }

    throw new Error("Failed to access microphone. Please check your browser settings.");
  }
}

/**
 * Convert Blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(durationInSeconds: number): string {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Validate audio file size
 */
export function validateAudioSize(blob: Blob, maxSizeInMB: number = 10): void {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (blob.size > maxSizeInBytes) {
    throw new Error(`Audio file is too large. Maximum size is ${maxSizeInMB}MB.`);
  }
}

/**
 * Create a MediaRecorder instance with the best settings
 */
export function createMediaRecorder(
  stream: MediaStream,
  options: AudioRecordingOptions = {}
): MediaRecorder {
  const defaultOptions: AudioRecordingOptions = {
    mimeType: getBestMimeType(),
    audioBitsPerSecond: 128000, // 128 kbps
    maxDuration: 300000, // 5 minutes
  };

  const finalOptions = { ...defaultOptions, ...options };

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: finalOptions.mimeType,
    audioBitsPerSecond: finalOptions.audioBitsPerSecond,
  });

  return mediaRecorder;
}

/**
 * Stop all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream): void {
  stream.getTracks().forEach(track => {
    track.stop();
  });
}

/**
 * Calculate audio levels for visualization (basic implementation)
 */
export function createAudioAnalyzer(stream: MediaStream): {
  getLevel: () => number;
  cleanup: () => void;
} {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  const analyzer = audioContext.createAnalyser();

  analyzer.fftSize = 256;
  source.connect(analyzer);

  const dataArray = new Uint8Array(analyzer.frequencyBinCount);

  return {
    getLevel: () => {
      analyzer.getByteFrequencyData(dataArray);

      // Calculate average level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }

      return sum / dataArray.length / 255; // Normalize to 0-1
    },
    cleanup: () => {
      source.disconnect();
      audioContext.close();
    }
  };
}

/**
 * Audio recording error types
 */
export class AudioRecordingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "AudioRecordingError";
  }
}

/**
 * Audio file format detection
 */
export function detectAudioFormat(blob: Blob): string {
  const type = blob.type;

  if (type.includes("webm")) return "webm";
  if (type.includes("mp4")) return "mp4";
  if (type.includes("wav")) return "wav";
  if (type.includes("ogg")) return "ogg";

  return "unknown";
}