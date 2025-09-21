import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// AWS Configuration
const REGION = process.env.AWS_REGION || process.env.AW_REGION || "us-east-1";
const BUCKET = process.env.S3_BUCKET;
const UPLOAD_PREFIX = process.env.S3_UPLOAD_PREFIX || "uploads/";

// Validate required environment variables
if (!BUCKET) {
  throw new Error("S3_BUCKET environment variable is required");
}

// Configure AWS SDK v3 with environment-appropriate credentials
const createS3Client = () => {
  const config: any = {
    region: REGION,
  };

  // In production or when explicit credentials are provided, use them
  if (process.env.AW_ACCESS_KEY_ID && process.env.AW_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AW_ACCESS_KEY_ID,
      secretAccessKey: process.env.AW_SECRET_ACCESS_KEY,
    };
    console.log(`Using explicit AWS credentials for region: ${REGION}`);
  } else if (process.env.AW_PROFILE) {
    // Local development with AWS SSO profile
    console.log(`Using AWS SSO profile: ${process.env.AW_PROFILE} for region: ${REGION}`);
  } else {
    console.log(`Using default AWS credential chain for region: ${REGION}`);
  }

  return new S3Client(config);
};

const s3 = createS3Client();

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  try {
    console.log(`Generating presigned URL for:`, {
      bucket: BUCKET,
      key: `${UPLOAD_PREFIX}${key}`,
      contentType,
      region: REGION,
    });

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${UPLOAD_PREFIX}${key}`,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
    console.log("Generated presigned URL successfully");

    return url;
  } catch (error) {
    console.error("Error generating presigned URL:", {
      error: error instanceof Error ? error.message : error,
      bucket: BUCKET,
      region: REGION,
      hasCredentials: !!(process.env.AW_ACCESS_KEY_ID && process.env.AW_SECRET_ACCESS_KEY),
      hasProfile: !!process.env.AW_PROFILE,
    });

    if (error instanceof Error && error.message.includes('credentials')) {
      throw new Error("AWS credentials not configured properly. Check your AW_ACCESS_KEY_ID and AW_SECRET_ACCESS_KEY environment variables, or ensure your AWS SSO profile is properly set up.");
    }

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

export async function uploadFileToS3(
  key: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<void> {
  try {
    console.log(`Uploading file to S3: ${BUCKET}/${UPLOAD_PREFIX}${key}`);

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${UPLOAD_PREFIX}${key}`,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3.send(command);
    console.log("File uploaded to S3 successfully");
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : "Unknown error"}`);
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