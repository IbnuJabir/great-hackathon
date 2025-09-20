import pdfParse from "pdf-parse";
import { downloadFileFromS3 } from "../aws/s3";
import { generateEmbedding } from "../aws/bedrock";
import { chunkText } from "./chunking";
import { prisma } from "../prisma";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

export async function processDocument(documentId: string) {
  try {
    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Download file from S3
    const fileBuffer = await downloadFileFromS3(document.s3Key);

    // Extract text based on file type
    let text: string;
    if (document.s3Key.toLowerCase().endsWith(".pdf")) {
      text = await extractTextFromPdf(fileBuffer);
    } else if (document.s3Key.toLowerCase().endsWith(".txt")) {
      text = fileBuffer.toString("utf-8");
    } else {
      throw new Error("Unsupported file type");
    }

    // Chunk the text
    const chunks = chunkText(text);

    // Process chunks in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (chunk) => {
          try {
            // Generate embedding
            const embedding = await generateEmbedding(chunk.text);

            // Store chunk in database
            await prisma.documentChunk.create({
              data: {
                documentId,
                chunkText: chunk.text,
                embedding: JSON.stringify(embedding), // Store as JSON string for now
                metadata: chunk.metadata,
              },
            });
          } catch (error) {
            console.error(`Error processing chunk ${chunk.metadata.chunkIndex}:`, error);
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`Processed ${chunks.length} chunks for document ${documentId}`);
  } catch (error) {
    console.error("Error processing document:", error);
    throw error;
  }
}