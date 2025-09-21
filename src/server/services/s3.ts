import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configure AWS SDK v3
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  } : undefined, // Use default credential chain if not provided
});

const BUCKET = process.env.S3_BUCKET!;
const UPLOAD_PREFIX = process.env.S3_UPLOAD_PREFIX || "uploads/";

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  try {
    console.log(`Generating presigned URL for bucket: ${BUCKET}, key: ${UPLOAD_PREFIX}${key}, contentType: ${contentType}`);

    const { PutObjectCommand } = await import('@aws-sdk/client-s3');

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${UPLOAD_PREFIX}${key}`,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
    console.log("Generated presigned URL successfully");

    return url;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function generatePresignedDownloadUrl(key: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
    return url;
  } catch (error) {
    console.error("Error generating presigned download URL:", error);
    throw new Error(`Failed to generate presigned download URL: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function downloadFileFromS3(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error("No file content received");
    }

    // Convert ReadableStream to Buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error("Error downloading file from S3:", error);
    throw new Error("Failed to download file");
  }
}