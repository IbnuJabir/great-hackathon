import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { generateAnswer } from "../services/bedrock";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  question: z.string().min(1).max(1000),
  documentIds: z.array(z.string().cuid()).optional(),
});

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().min(1).max(20).default(5),
  documentIds: z.array(z.string().cuid()).optional(),
});

export const chatRouter = router({
  // Handle RAG queries
  query: protectedProcedure
    .input(querySchema)
    .mutation(async ({ input, ctx }) => {
      const { question, documentIds } = input;

      console.log(`Processing query: "${question}" for user ${ctx.user.id}`);

      // Build search conditions
      const searchConditions: any = {
        document: {
          uploaderId: ctx.user.id,
          status: "COMPLETED",
        },
      };

      // Filter by specific documents if provided
      if (documentIds && documentIds.length > 0) {
        searchConditions.documentId = {
          in: documentIds,
        };
      }

      // Simple text-based search for now (will implement vector search later)
      const relevantChunks = await prisma.documentChunk.findMany({
        where: {
          ...searchConditions,
          chunkText: {
            contains: question,
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
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
      });

      console.log(`Found ${relevantChunks.length} relevant chunks`);

      if (relevantChunks.length === 0) {
        return {
          answer: "I couldn't find any relevant information in your documents to answer this question.",
          sources: [],
          query: question,
        };
      }

      // Prepare context for the LLM
      const context = relevantChunks
        .map((chunk, index) =>
          `Source ${index + 1} (from ${chunk.document.title}):\n${chunk.chunkText}`
        )
        .join("\n\n");

      // Generate answer using Bedrock
      const answer = await generateAnswer(question, context);

      // Prepare sources for the frontend
      const sources = relevantChunks.map((chunk) => ({
        id: chunk.id,
        documentId: chunk.documentId,
        documentTitle: chunk.document.title,
        chunkText: chunk.chunkText,
        metadata: chunk.metadata,
      }));

      return {
        answer,
        sources,
        query: question,
      };
    }),

  // Search documents
  search: protectedProcedure
    .input(searchSchema)
    .query(async ({ input, ctx }) => {
      const { query, limit, documentIds } = input;

      console.log(`Searching documents for: "${query}" (limit: ${limit})`);

      // Build search conditions
      const searchConditions: any = {
        document: {
          uploaderId: ctx.user.id,
          status: "COMPLETED",
        },
      };

      // Filter by specific documents if provided
      if (documentIds && documentIds.length > 0) {
        searchConditions.documentId = {
          in: documentIds,
        };
      }

      // Simple text-based search
      const results = await prisma.documentChunk.findMany({
        where: {
          ...searchConditions,
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

      return {
        results: results.map((chunk) => ({
          id: chunk.id,
          documentId: chunk.documentId,
          documentTitle: chunk.document.title,
          chunkText: chunk.chunkText,
          metadata: chunk.metadata,
        })),
        query,
        count: results.length,
      };
    }),
});