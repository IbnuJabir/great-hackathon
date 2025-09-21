import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { generatePresignedUploadUrl, generatePresignedDownloadUrl } from "../services/s3";
import { processDocument } from "../services/documents";
import { prisma } from "@/lib/prisma";

const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
  extractedText: z.string().optional(), // For PDFs with client-side extracted text
});

const processSchema = z.object({
  documentId: z.string().cuid(),
});

export const documentsRouter = router({
  // Generate presigned upload URL and create document record
  getUploadUrl: protectedProcedure
    .input(uploadSchema)
    .mutation(async ({ input, ctx }) => {
      const { fileName, fileType, fileSize, extractedText } = input;

      // Validate file type
      const allowedTypes = ["application/pdf", "text/plain"];
      if (!allowedTypes.includes(fileType)) {
        throw new Error("File type not supported. Only PDF and TXT files are allowed.");
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        throw new Error("File too large. Maximum size is 10MB.");
      }

      // Generate unique S3 key
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const s3Key = `${timestamp}-${sanitizedFileName}`;

      // Create document record in database
      const document = await prisma.document.create({
        data: {
          title: fileName,
          s3Key: `uploads/${s3Key}`,
          uploaderId: ctx.user.id,
          metadata: {
            originalName: fileName,
            fileType,
            fileSize,
            extractedText: extractedText || null, // Store extracted text if provided
          },
        },
      });

      // Generate presigned upload URL
      const uploadUrl = await generatePresignedUploadUrl(s3Key, fileType);

      return {
        documentId: document.id,
        uploadUrl,
        s3Key: document.s3Key,
      };
    }),

  // Start document processing
  processDocument: protectedProcedure
    .input(processSchema)
    .mutation(async ({ input, ctx }) => {
      const { documentId } = input;

      // Verify document belongs to user
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          uploaderId: ctx.user.id,
        },
      });

      if (!document) {
        throw new Error("Document not found or access denied");
      }

      // Check if document is already processed successfully
      if (document.status === "COMPLETED") {
        throw new Error("Document already processed successfully");
      }

      // Allow retrying failed or pending documents
      if (document.status === "PROCESSING") {
        throw new Error("Document is currently being processed");
      }

      // Clear existing chunks if retrying a failed document
      if (document.status === "FAILED") {
        await prisma.documentChunk.deleteMany({
          where: { documentId },
        });
      }

      console.log(`Starting async processing for document ${documentId}`);

      // Process document asynchronously
      processDocument(documentId).catch((error) => {
        console.error(`Failed to process document ${documentId}:`, error);
        console.error("Full error stack:", error.stack);
      });

      return {
        message: "Document processing started",
        documentId,
      };
    }),

  // List user's documents
  listDocuments: protectedProcedure
    .query(async ({ ctx }) => {
      // Fetch user's documents with chunk counts
      const documents = await prisma.document.findMany({
        where: {
          uploaderId: ctx.user.id,
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

      return { documents: formattedDocuments };
    }),

  // Get document status
  getDocumentStatus: protectedProcedure
    .input(z.object({ documentId: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      // Verify document belongs to user
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          uploaderId: ctx.user.id,
        },
        include: {
          chunks: {
            select: { id: true },
          },
        },
      });

      if (!document) {
        throw new Error("Document not found or access denied");
      }

      const chunkCount = document.chunks.length;
      const isProcessed = document.status === "COMPLETED";

      return {
        documentId: document.id,
        title: document.title,
        status: document.status,
        isProcessed,
        chunkCount,
        processingError: document.processingError,
        createdAt: document.createdAt.toISOString(),
      };
    }),

  // Get document download URL
  getDocumentUrl: protectedProcedure
    .input(z.object({ documentId: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      // Verify document belongs to user
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          uploaderId: ctx.user.id,
        },
      });

      if (!document) {
        throw new Error("Document not found or access denied");
      }

      // Generate presigned download URL
      const downloadUrl = await generatePresignedDownloadUrl(document.s3Key);

      return {
        downloadUrl,
        title: document.title,
      };
    }),
});