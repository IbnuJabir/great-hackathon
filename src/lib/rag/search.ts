import { prisma } from "../prisma";
import { generateEmbedding } from "../aws/bedrock";

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  chunkText: string;
  similarity: number;
  metadata: any;
}

export async function searchDocuments(
  query: string,
  userId: string,
  limit: number = 5
): Promise<SearchResult[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // For now, we'll use a simple text search until we implement proper vector search
    // In production, this would use pgvector cosine similarity
    const chunks = await prisma.documentChunk.findMany({
      where: {
        document: {
          uploaderId: userId,
        },
        chunkText: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert to SearchResult format
    return chunks.map((chunk) => ({
      chunkId: chunk.id,
      documentId: chunk.document.id,
      documentTitle: chunk.document.title,
      chunkText: chunk.chunkText,
      similarity: 0.8, // Placeholder similarity score
      metadata: chunk.metadata,
    }));

  } catch (error) {
    console.error("Error searching documents:", error);
    throw new Error("Failed to search documents");
  }
}

export function formatContextForLLM(results: SearchResult[]): string {
  return results
    .map((result, index) => {
      return `[Source ${index + 1} - ${result.documentTitle}]
${result.chunkText}
`;
    })
    .join("\n\n");
}