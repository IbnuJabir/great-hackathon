import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUploadUrl } from "@/lib/aws/s3";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-server";
import { z } from "zod";

const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, fileType, fileSize } = uploadSchema.parse(body);

    // Validate file type
    const allowedTypes = ["application/pdf", "text/plain"];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: "File type not supported. Only PDF and TXT files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Generate unique S3 key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const s3Key = `${timestamp}-${sanitizedFileName}`;

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        title: fileName,
        s3Key: `uploads/${s3Key}`,
        uploaderId: session.user.id,
        metadata: {
          originalName: fileName,
          fileType,
          fileSize,
        },
      },
    });

    // Generate presigned upload URL
    const uploadUrl = await generatePresignedUploadUrl(s3Key, fileType);

    return NextResponse.json({
      documentId: document.id,
      uploadUrl,
      s3Key: document.s3Key,
    });

  } catch (error) {
    console.error("Error creating upload URL:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    // Add more specific error details for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Detailed error:", errorMessage);

    return NextResponse.json(
      {
        error: "Failed to create upload URL",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}