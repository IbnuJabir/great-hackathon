import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { downloadFileFromS3 } from "../aws/s3";
import { generateEmbedding } from "../aws/bedrock";
import { chunkText } from "./chunking";
import { prisma } from "../prisma";

// Configure Textract
const textract = new TextractClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  } : undefined, // Use default credential chain if not provided
});

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    console.log("Starting PDF text extraction with Textract");

    // Use AWS Textract for PDF text extraction
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: buffer,
      },
    });

    console.log("Sending request to Textract...");
    const response = await textract.send(command);

    if (!response.Blocks || response.Blocks.length === 0) {
      throw new Error("No text blocks found in document");
    }

    // Extract text from Textract blocks
    const textBlocks = response.Blocks
      .filter(block => block.BlockType === "LINE")
      .map(block => block.Text)
      .filter(text => text && text.trim().length > 0)
      .join("\n");

    if (!textBlocks || textBlocks.trim().length === 0) {
      throw new Error("No readable text found in PDF");
    }

    console.log(`Successfully extracted ${textBlocks.length} characters using Textract`);
    return textBlocks;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.name === "AccessDenied" || error.message.includes("AccessDenied") || error.message.includes("not authorized")) {
        throw new Error("AWS Textract access denied by organizational policy. Please contact your AWS administrator to enable Textract access, or use text-based PDFs only.");
      }
      if (error.message.includes("service control policy")) {
        throw new Error("Textract blocked by organizational policy. Contact your AWS administrator or try uploading text files (.txt) instead.");
      }
      if (error.message.includes("InvalidDocument")) {
        throw new Error("Invalid or corrupted PDF document.");
      }
      if (error.message.includes("UnsupportedDocument")) {
        throw new Error("PDF format not supported by Textract.");
      }
    }

    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

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
    // Extract text based on file type
    let text: string;
    if (document.s3Key.toLowerCase().endsWith(".pdf")) {
      text = await extractTextFromPdf(fileBuffer);
    } else if (document.s3Key.toLowerCase().endsWith(".txt")) {
      text = fileBuffer.toString("utf-8");
    } else {
      throw new Error("Unsupported file type");
    }

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