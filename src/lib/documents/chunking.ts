export interface DocumentChunk {
  text: string;
  metadata: {
    startIndex: number;
    endIndex: number;
    chunkIndex: number;
  };
}

export function chunkText(
  text: string,
  maxTokens: number = 800,
  overlapTokens: number = 100
): DocumentChunk[] {
  // Simple word-based approximation: ~4 chars per token
  const avgCharsPerToken = 4;
  const maxChars = maxTokens * avgCharsPerToken;
  const overlapChars = overlapTokens * avgCharsPerToken;

  const chunks: DocumentChunk[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + maxChars, text.length);

    // Try to break at sentence boundaries
    if (endIndex < text.length) {
      const lastSentence = text.lastIndexOf(".", endIndex);
      const lastNewline = text.lastIndexOf("\n", endIndex);
      const breakPoint = Math.max(lastSentence, lastNewline);

      if (breakPoint > startIndex + maxChars / 2) {
        endIndex = breakPoint + 1;
      }
    }

    const chunkText = text.slice(startIndex, endIndex).trim();

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        metadata: {
          startIndex,
          endIndex,
          chunkIndex: chunks.length,
        },
      });
    }

    // Move start index with overlap
    startIndex = Math.max(endIndex - overlapChars, endIndex);
  }

  return chunks;
}