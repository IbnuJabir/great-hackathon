import { downloadFileFromS3 } from "./s3";
import { generateEmbedding } from "./bedrock";
import { extractTextWithBedrock, analyzeDocumentStructure } from "./bedrock-document";
import { prisma } from "@/lib/prisma";
import { chunkText } from "@/lib/documents/chunking";



export async function processDocument(documentId: string) {
  try {
    console.log(`Starting processing for document ${documentId}`);

    // Mark document as processing
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "PROCESSING",
        processingError: null,
      },
    });

    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    console.log(`Downloading file from S3: ${document.s3Key}`);
    // Download file from S3
    const fileBuffer = await downloadFileFromS3(document.s3Key);

    console.log(`Extracting text from document type: ${document.s3Key.split('.').pop()}`);

    // Extract text using server-side Bedrock processing
    let text: string;
    const metadata = document.metadata as any;

    if (document.s3Key.toLowerCase().endsWith(".pdf")) {
      console.log("Processing PDF with Bedrock Nova models");

      // Use Bedrock processing for all PDFs
      try {
        const analysis = await analyzeDocumentStructure(fileBuffer, document.title || document.s3Key);
        text = analysis.text;

        // Update document metadata with analysis results
        await prisma.document.update({
          where: { id: documentId },
          data: {
            metadata: {
              ...metadata,
              hasImages: analysis.metadata.hasImages,
              hasTables: analysis.metadata.hasTables,
              pageCount: analysis.metadata.pageCount,
              sections: analysis.metadata.sections,
              processingMethod: 'bedrock-nova'
            }
          }
        });

        console.log(`Bedrock analysis complete: ${analysis.metadata.sections.length} sections, images: ${analysis.metadata.hasImages}, tables: ${analysis.metadata.hasTables}`);
      } catch (analysisError) {
        console.warn("Enhanced analysis failed, falling back to simple extraction:", analysisError);
        text = await extractTextWithBedrock(fileBuffer, document.title || document.s3Key);
      }
    } else if (document.s3Key.toLowerCase().endsWith(".txt")) {
      console.log("Processing TXT file");
      text = fileBuffer.toString("utf-8");
    } else {
      throw new Error("Unsupported file type");
    }

    // Validate extracted text
    console.log("Validating extracted text content");

    if (!text || text.trim().length === 0) {
      throw new Error("No text content extracted from document");
    }

    console.log(`Extracted ${text.length} characters of text`);

    // Chunk the text
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error("No chunks created from document text");
    }

    // Process chunks in batches to avoid rate limits
    const batchSize = 5;
    let processedChunks = 0;
    let failedChunks = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);

      const results = await Promise.allSettled(
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

            return { success: true, chunkIndex: chunk.metadata.chunkIndex };
          } catch (error) {
            console.error(`Error processing chunk ${chunk.metadata.chunkIndex}:`, error);
            return { success: false, chunkIndex: chunk.metadata.chunkIndex, error };
          }
        })
      );

      // Count results
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          processedChunks++;
        } else {
          failedChunks++;
        }
      });

      // Small delay between batches
      if (i + batchSize < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`Processing complete: ${processedChunks} successful, ${failedChunks} failed chunks`);

    if (processedChunks === 0) {
      throw new Error("Failed to process any chunks - check AWS credentials and permissions");
    }

    // Mark document as completed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "COMPLETED",
        processingError: failedChunks > 0 ? `${failedChunks} chunks failed to process` : null,
      },
    });

    console.log(`Document ${documentId} processing completed successfully`);
  } catch (error) {
    console.error("Error processing document:", error);

    // Mark document as failed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        processingError: error instanceof Error ? error.message : "Unknown error occurred",
      },
    }).catch((dbError) => {
      console.error("Failed to update document status to FAILED:", dbError);
    });

    throw error;
  }
}