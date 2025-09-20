import AWS from "aws-sdk";

// Configure AWS SDK v2
AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  sessionToken: process.env.AWS_SESSION_TOKEN,
});

const s3 = new AWS.S3();

const BUCKET = process.env.S3_BUCKET!;
const UPLOAD_PREFIX = process.env.S3_UPLOAD_PREFIX || "uploads/";

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const params = {
    Bucket: BUCKET,
    Key: `${UPLOAD_PREFIX}${key}`,
    ContentType: contentType,
    Expires: 3600, // 1 hour
  };

  const url = s3.getSignedUrl("putObject", params);
  console.log("Generated presigned URL:", url);

  return url;
}

export async function downloadFileFromS3(key: string): Promise<Buffer> {
  try {
    const params = {
      Bucket: BUCKET,
      Key: key,
    };

    const response = await s3.getObject(params).promise();

    if (!response.Body) {
      throw new Error("No file content received");
    }

    return response.Body as Buffer;
  } catch (error) {
    console.error("Error downloading file from S3:", error);
    throw new Error("Failed to download file");
  }
}