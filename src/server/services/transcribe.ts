import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// Configure AWS clients to use SSO profile or default credential chain
const transcribeClient = new TranscribeClient({
  region: process.env.AWS_REGION || "us-east-1",
  // Remove explicit credentials to use default credential chain (SSO profile)
  // The AWS SDK will automatically use the profile specified in AWS_PROFILE env var
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  // Remove explicit credentials to use default credential chain (SSO profile)
  // The AWS SDK will automatically use the profile specified in AWS_PROFILE env var
});

interface TranscriptionResult {
  transcriptText: string;
  confidence?: number;
  jobName?: string;
}

/**
 * Upload audio file to S3 for transcription
 */
async function uploadAudioToS3(audioBuffer: Buffer, fileName: string): Promise<string> {
  const bucketName = process.env.S3_BUCKET!;
  const key = `transcriptions/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: audioBuffer,
    ContentType: "audio/webm",
  });

  await s3Client.send(command);
  return `s3://${bucketName}/${key}`;
}

/**
 * Start transcription job with AWS Transcribe
 */
async function startTranscriptionJob(s3Uri: string, jobName: string): Promise<void> {
  const command = new StartTranscriptionJobCommand({
    TranscriptionJobName: jobName,
    Media: {
      MediaFileUri: s3Uri,
    },
    MediaFormat: "webm",
    LanguageCode: "en-US",
    // Let AWS Transcribe use its default output location
    // OutputBucketName: process.env.S3_BUCKET!,
    // OutputKey: `transcriptions/output/${jobName}.json`,
    Settings: {
      // Don't use speaker labels for single speaker recordings
      ChannelIdentification: false,
    },
  });

  await transcribeClient.send(command);
}

/**
 * Get transcription job status and result
 */
async function getTranscriptionResult(jobName: string): Promise<TranscriptionResult | null> {
  const command = new GetTranscriptionJobCommand({
    TranscriptionJobName: jobName,
  });

  const response = await transcribeClient.send(command);
  const job = response.TranscriptionJob;

  if (!job) {
    throw new Error("Transcription job not found");
  }

  if (job.TranscriptionJobStatus === "COMPLETED") {
    const transcript = job.Transcript;
    if (transcript?.TranscriptFileUri) {
      // Fetch the transcript from S3
      const transcriptResponse = await fetch(transcript.TranscriptFileUri);

      // Check if the response is successful
      if (!transcriptResponse.ok) {
        throw new Error(`Failed to fetch transcript file: ${transcriptResponse.status} ${transcriptResponse.statusText}`);
      }

      // Get response text first to check if it's JSON
      const responseText = await transcriptResponse.text();

      // Check if response starts with XML (error case)
      if (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<Error>')) {
        console.error("AWS returned XML error response:", responseText);
        throw new Error("Access denied to transcript file. Check AWS permissions.");
      }

      let transcriptData;
      try {
        transcriptData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse transcript JSON:", responseText);
        throw new Error("Invalid transcript format received");
      }

      const transcriptText = transcriptData.results?.transcripts?.[0]?.transcript || "";
      const confidence = transcriptData.results?.items?.[0]?.alternatives?.[0]?.confidence;

      return {
        transcriptText,
        confidence,
        jobName,
      };
    }
  } else if (job.TranscriptionJobStatus === "FAILED") {
    throw new Error(`Transcription failed: ${job.FailureReason}`);
  }

  // Job is still in progress
  return null;
}

/**
 * Poll for transcription completion with timeout
 */
async function waitForTranscription(jobName: string, maxWaitTime = 60000): Promise<TranscriptionResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const result = await getTranscriptionResult(jobName);
    if (result) {
      return result;
    }

    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error("Transcription timeout - job did not complete in time");
}

/**
 * Main function to transcribe audio from buffer
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult> {
  try {
    // Generate unique job name
    const jobName = `transcription-${randomUUID()}`;
    const fileName = `${jobName}.webm`;

    console.log(`Starting transcription job: ${jobName}`);

    // Upload audio to S3
    const s3Uri = await uploadAudioToS3(audioBuffer, fileName);
    console.log(`Audio uploaded to: ${s3Uri}`);

    // Start transcription job
    await startTranscriptionJob(s3Uri, jobName);
    console.log(`Transcription job started: ${jobName}`);

    // Wait for completion and get result
    const result = await waitForTranscription(jobName);
    console.log(`Transcription completed: ${result.transcriptText}`);

    return result;
  } catch (error) {
    console.error("Error during transcription:", error);
    throw new Error("Failed to transcribe audio");
  }
}

/**
 * Simplified transcription for short audio clips using direct API call
 * Note: This is a placeholder for real-time transcription
 */
export async function transcribeAudioQuick(audioBuffer: Buffer): Promise<string> {
  // For demo purposes, we'll use the regular transcription
  // In production, you might want to use AWS Transcribe Streaming API
  // or a simpler service for short clips

  try {
    const result = await transcribeAudio(audioBuffer);
    return result.transcriptText;
  } catch (error) {
    console.error("Quick transcription failed:", error);
    throw new Error("Failed to transcribe audio quickly");
  }
}