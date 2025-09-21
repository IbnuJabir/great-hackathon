import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { transcribeAudio, transcribeAudioQuick } from "../services/transcribe";

const transcribeSchema = z.object({
  audioData: z.string(), // base64 encoded audio data
  format: z.enum(["webm", "wav", "mp3"]).default("webm"),
  quick: z.boolean().default(true), // Use quick transcription for shorter clips
});

const maxAudioSize = 10 * 1024 * 1024; // 10MB limit

export const voiceRouter = router({
  // Transcribe audio data
  transcribe: protectedProcedure
    .input(transcribeSchema)
    .mutation(async ({ input, ctx }) => {
      const { audioData, format, quick } = input;

      console.log(`Processing voice transcription for user ${ctx.user.id}`);

      try {
        // Decode base64 audio data
        const audioBuffer = Buffer.from(audioData, "base64");

        // Check file size
        if (audioBuffer.length > maxAudioSize) {
          throw new Error("Audio file too large. Maximum size is 10MB.");
        }

        console.log(`Audio buffer size: ${audioBuffer.length} bytes, format: ${format}`);

        // Transcribe audio
        let transcriptText: string;

        if (quick) {
          transcriptText = await transcribeAudioQuick(audioBuffer);
        } else {
          const result = await transcribeAudio(audioBuffer);
          transcriptText = result.transcriptText;
        }

        console.log(`Transcription completed: "${transcriptText}"`);

        return {
          transcriptText: transcriptText.trim(),
          success: true,
        };
      } catch (error) {
        console.error("Voice transcription error:", error);

        // Return user-friendly error messages
        if (error instanceof Error) {
          if (error.message.includes("too large")) {
            throw new Error("Audio file is too large. Please record a shorter message.");
          } else if (error.message.includes("timeout")) {
            throw new Error("Transcription is taking too long. Please try again with a shorter recording.");
          } else if (error.message.includes("Failed to transcribe")) {
            throw new Error("Could not transcribe audio. Please check your microphone and try again.");
          }
        }

        throw new Error("Failed to process voice message. Please try again.");
      }
    }),

  // Check transcription status (for async operations)
  checkStatus: protectedProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      // This would be used for checking the status of longer transcription jobs
      // For now, we'll return a simple response since we're using synchronous transcription
      return {
        jobId: input.jobId,
        status: "completed",
        result: null,
      };
    }),

  // Test endpoint to verify voice router is working
  test: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        message: "Voice router is working",
        userId: ctx.user.id,
        timestamp: new Date().toISOString(),
      };
    }),
});