import { NextRequest, NextResponse } from "next/server";
import { processDocument } from "@/lib/documents/processing";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-server";
import { z } from "zod";

const ingestSchema = z.object({
  documentId: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentId } = ingestSchema.parse(body);

    // Verify document belongs to user
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        uploaderId: session.user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found or access denied" },
        { status: 404 }
      );
    }

    // Check if document is already processed
    const existingChunks = await prisma.documentChunk.findFirst({
      where: { documentId },
    });

    if (existingChunks) {
      return NextResponse.json(
        { error: "Document already processed" },
        { status: 400 }
      );
    }

    // Process document asynchronously
    processDocument(documentId).catch((error) => {
      console.error(`Failed to process document ${documentId}:`, error);
    });

    return NextResponse.json({
      message: "Document processing started",
      documentId,
    });

  } catch (error) {
    console.error("Error starting document ingestion:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to start document processing" },
      { status: 500 }
    );
  }
}