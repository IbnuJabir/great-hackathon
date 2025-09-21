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
    // For hackathon: Use enhanced text search with better relevance
    const chunks = await prisma.documentChunk.findMany({
      where: {
        document: {
          uploaderId: userId,
        },
        OR: [
          {
            chunkText: {
              contains: query,
              mode: "insensitive",
            },
          },
          // Add keyword-based search as fallback
          ...query.split(" ").map(word => ({
            chunkText: {
              contains: word,
              mode: "insensitive" as const,
            },
          })),
        ],
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      take: limit * 2, // Get more results for better filtering
    });

    // Score and sort results by relevance
    const scoredChunks = chunks.map((chunk) => {
      const text = chunk.chunkText.toLowerCase();
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(" ");

      let score = 0;

      // Exact phrase match (highest score)
      if (text.includes(queryLower)) {
        score += 1.0;
      }

      // Word matches
      queryWords.forEach(word => {
        if (text.includes(word)) {
          score += 0.3;
        }
      });

      // Technical relevance boost for manufacturing terms
      const technicalTerms = ["maintenance", "repair", "troubleshoot", "error", "warning", "procedure", "step", "instruction"];
      technicalTerms.forEach(term => {
        if (text.includes(term)) {
          score += 0.2;
        }
      });

      return {
        ...chunk,
        relevanceScore: score,
      };
    });

    // Sort by relevance and take top results
    const topChunks = scoredChunks
      .filter(chunk => chunk.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    // Convert to SearchResult format
    return topChunks.map((chunk) => ({
      chunkId: chunk.id,
      documentId: chunk.document.id,
      documentTitle: chunk.document.title,
      chunkText: chunk.chunkText,
      similarity: Math.min(0.95, chunk.relevanceScore), // Normalize to similarity score
      metadata: chunk.metadata,
    }));

  } catch (error) {
    console.error("Error searching documents:", error);

    // Simple fallback
    const fallbackChunks = await prisma.documentChunk.findMany({
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
    });

    return fallbackChunks.map((chunk) => ({
      chunkId: chunk.id,
      documentId: chunk.document.id,
      documentTitle: chunk.document.title,
      chunkText: chunk.chunkText,
      similarity: 0.5,
      metadata: chunk.metadata,
    }));
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