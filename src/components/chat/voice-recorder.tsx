"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import {
  isRecordingSupported,
  requestMicrophonePermission,
  createMediaRecorder,
  stopMediaStream,
  blobToBase64,
  validateAudioSize,
  formatDuration,
  createAudioAnalyzer,
  AudioRecordingError,
  getBestMimeType,
  detectAudioFormat
} from "@/lib/audio/audio-utils";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  maxDuration?: number; // in seconds
  className?: string;
}

type RecordingState = "idle" | "requesting-permission" | "recording" | "processing";

export function VoiceRecorder({
  onTranscriptionComplete,
  onError,
  disabled = false,
  maxDuration = 300, // 5 minutes default
  className
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioAnalyzerRef = useRef<{ getLevel: () => number; cleanup: () => void } | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const levelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // tRPC mutation for transcription
  const transcribeMutation = trpc.voice.transcribe.useMutation();

  // Check if recording is supported (client-side only)
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  // Check support on client-side only to avoid hydration mismatch
  useEffect(() => {
    setIsSupported(isRecordingSupported());
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }

    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.cleanup();
      audioAnalyzerRef.current = null;
    }

    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }

    setDuration(0);
    setAudioLevel(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setState("requesting-permission");
      setError(null);

      // Request microphone permission
      const stream = await requestMicrophonePermission();
      streamRef.current = stream;

      // Create audio analyzer for level visualization
      audioAnalyzerRef.current = createAudioAnalyzer(stream);

      // Create media recorder
      const mediaRecorder = createMediaRecorder(stream, {
        mimeType: getBestMimeType(),
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up event listeners
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setState("processing");

        try {
          // Combine audio chunks
          const audioBlob = new Blob(audioChunksRef.current, {
            type: getBestMimeType(),
          });

          // Validate file size (10MB limit)
          validateAudioSize(audioBlob, 10);

          // Convert to base64 for transmission
          const base64Audio = await blobToBase64(audioBlob);
          const format = detectAudioFormat(audioBlob);

          console.log(`Audio recorded: ${audioBlob.size} bytes, format: ${format}`);

          // Send to transcription service (this would be implemented separately)
          await handleTranscription(base64Audio, format);

        } catch (error) {
          console.error("Error processing audio:", error);
          if (error instanceof Error) {
            setError(error.message);
            onError(error.message);
          } else {
            setError("Failed to process audio recording");
            onError("Failed to process audio recording");
          }
        } finally {
          setState("idle");
          cleanup();
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording failed. Please try again.");
        onError("Recording failed. Please try again.");
        setState("idle");
        cleanup();
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setState("recording");

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;

          // Stop recording if max duration reached
          if (newDuration >= maxDuration) {
            stopRecording();
            return maxDuration;
          }

          return newDuration;
        });
      }, 1000);

      // Start audio level monitoring
      levelIntervalRef.current = setInterval(() => {
        if (audioAnalyzerRef.current) {
          setAudioLevel(audioAnalyzerRef.current.getLevel());
        }
      }, 100);

    } catch (error) {
      console.error("Error starting recording:", error);
      if (error instanceof Error) {
        setError(error.message);
        onError(error.message);
      } else {
        setError("Failed to start recording");
        onError("Failed to start recording");
      }
      setState("idle");
      cleanup();
    }
  }, [maxDuration, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  const handleTranscription = async (base64Audio: string, format: string) => {
    console.log("Starting transcription...", { format, size: base64Audio.length });

    try {
      const result = await transcribeMutation.mutateAsync({
        audioData: base64Audio,
        format: format as "webm" | "wav" | "mp3",
        quick: true,
      });

      console.log("Transcription result:", result);

      if (result.success && result.transcriptText) {
        onTranscriptionComplete(result.transcriptText);
      } else {
        throw new Error("No transcription text received");
      }
    } catch (error) {
      console.error("Transcription failed:", error);
      throw error;
    }
  };

  const handleToggleRecording = useCallback(() => {
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle") {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  // Show loading state during SSR/initial render
  if (isSupported === null) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled
          className="h-8 w-8 p-0 rounded-full opacity-50"
        >
          <Mic className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Show not supported message
  if (isSupported === false) {
    return (
      <div className="text-sm text-muted-foreground">
        Voice recording not supported in this browser
      </div>
    );
  }

  const isActive = state !== "idle";
  const isRecording = state === "recording";
  const isProcessing = state === "processing";
  const isRequestingPermission = state === "requesting-permission";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Recording button */}
      <Button
        type="button"
        variant={isRecording ? "destructive" : "secondary"}
        size="sm"
        onClick={handleToggleRecording}
        disabled={disabled || isProcessing || isRequestingPermission}
        className={cn(
          "h-8 w-8 p-0 rounded-full transition-all duration-200",
          isRecording && "animate-pulse",
          isProcessing && "opacity-50"
        )}
        title={isRecording ? "Stop recording" : "Start voice recording"}
      >
        {isRequestingPermission || isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <Square className="h-3 w-3" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* Recording status and duration */}
      {isActive && (
        <div className="flex items-center gap-2 text-sm">
          {isRecording && (
            <>
              {/* Audio level indicator */}
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1 h-3 bg-red-500 rounded-full transition-opacity duration-100",
                      audioLevel * 5 > i ? "opacity-100" : "opacity-20"
                    )}
                  />
                ))}
              </div>

              {/* Duration */}
              <span className="text-red-500 font-mono">
                {formatDuration(duration)}
              </span>
            </>
          )}

          {isProcessing && (
            <span className="text-muted-foreground">
              Transcribing...
            </span>
          )}

          {isRequestingPermission && (
            <span className="text-muted-foreground">
              Requesting permission...
            </span>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="text-xs text-red-500 max-w-48 truncate" title={error}>
          {error}
        </div>
      )}
    </div>
  );
}