import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Verify document belongs to user
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        uploaderId: session.user.id,
      },
      include: {
        chunks: {
          select: { id: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found or access denied" },
        { status: 404 }
      );
    }

    const chunkCount = document.chunks.length;
    const isProcessed = chunkCount > 0;

    return NextResponse.json({
      documentId,
      title: document.title,
      isProcessed,
      chunkCount,
      createdAt: document.createdAt,
    });

  } catch (error) {
    console.error("Error checking document status:", error);
    return NextResponse.json(
      { error: "Failed to check document status" },
      { status: 500 }
    );
  }
}