import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ensure server-side environment variables are available at runtime
  serverRuntimeConfig: {
    // Will be available on both server and client
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM,
  },
  // Make environment variables available at runtime
  env: {
    // Email service
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,

    // Database
    DATABASE_URL: process.env.DATABASE_URL,

    // Authentication
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,

    // OAuth providers
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    // AWS Services
    AWS_REGION: process.env.AWS_REGION,
    AW_REGION: process.env.AW_REGION, // Fallback region variable
    AW_ACCESS_KEY_ID: process.env.AW_ACCESS_KEY_ID,
    AW_SECRET_ACCESS_KEY: process.env.AW_SECRET_ACCESS_KEY,
    AW_PROFILE: process.env.AW_PROFILE, // For local development
    S3_BUCKET: process.env.S3_BUCKET,
    S3_UPLOAD_PREFIX: process.env.S3_UPLOAD_PREFIX,

    // Bedrock Models
    BEDROCK_EMBEDDING_MODEL: process.env.BEDROCK_EMBEDDING_MODEL,
    BEDROCK_LLM_MODEL: process.env.BEDROCK_LLM_MODEL,
    BEDROCK_VISION_MODEL: process.env.BEDROCK_VISION_MODEL,

    // App configuration
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,

    // Feature flags
    ENABLE_TEXTRACT: process.env.ENABLE_TEXTRACT,
  },
};

export default nextConfig;
