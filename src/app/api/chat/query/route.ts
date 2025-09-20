import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { searchDocuments, formatContextForLLM } from "@/lib/rag/search";
import { generateAnswer } from "@/lib/aws/bedrock";
import { z } from "zod";

const querySchema = z.object({
  question: z.string().min(1).max(1000),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { question } = querySchema.parse(body);

    // Search for relevant document chunks
    const searchResults = await searchDocuments(question, session.user.id, 5);

    if (searchResults.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find any relevant information in your uploaded documents. Please try rephrasing your question or upload more documents.",
        sources: [],
        question,
      });
    }

    // Format context for LLM
    const context = formatContextForLLM(searchResults);

    // Generate answer using LLM
    const answer = await generateAnswer(question, context);

    // Return response with sources
    return NextResponse.json({
      answer,
      sources: searchResults.map((result) => ({
        documentId: result.documentId,
        documentTitle: result.documentTitle,
        chunkText: result.chunkText.slice(0, 200) + "...", // Truncate for display
        similarity: result.similarity,
      })),
      question,
    });

  } catch (error) {
    console.error("Error processing query:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid question format", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}