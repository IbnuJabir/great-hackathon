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

    // Fetch user's documents with chunk counts
    const documents = await prisma.document.findMany({
      where: {
        uploaderId: session.user.id,
      },
      include: {
        chunks: {
          select: { id: true }, // Only need count
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format documents for frontend
    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      isProcessed: doc.status === "COMPLETED",
      chunkCount: doc.chunks.length,
      processingError: doc.processingError,
      createdAt: doc.createdAt.toISOString(),
    }));

    return NextResponse.json({ documents: formattedDocuments });

  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}