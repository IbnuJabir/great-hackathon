import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET!;
const UPLOAD_PREFIX = process.env.S3_UPLOAD_PREFIX || "uploads/";

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: `${UPLOAD_PREFIX}${key}`,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour
}

export async function downloadFileFromS3(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const response = await client.send(command);

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