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
  // Debug endpoint to check database contents
  debug: protectedProcedure
    .query(async ({ ctx }) => {
      const documents = await prisma.document.findMany({
        where: { uploaderId: ctx.user.id },
        include: {
          chunks: true,
        },
      });

      const totalChunks = await prisma.documentChunk.count({
        where: {
          document: {
            uploaderId: ctx.user.id,
          },
        },
      });

      return {
        documentsCount: documents.length,
        documents: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          status: doc.status,
          chunksCount: doc.chunks.length,
          hasText: doc.chunks.length > 0 ? doc.chunks[0].chunkText.substring(0, 100) : "No chunks",
        })),
        totalChunks,
      };
    }),

  // Handle RAG queries
  query: protectedProcedure
    .input(querySchema)
    .mutation(async ({ input, ctx }) => {
      const { question, documentIds } = input;

      console.log(`Processing query: "${question}" for user ${ctx.user.id}`);

      // First, let's check what documents exist
      const userDocuments = await prisma.document.findMany({
        where: { uploaderId: ctx.user.id },
        include: { chunks: { take: 1 } },
      });

      console.log(`User has ${userDocuments.length} documents:`,
        userDocuments.map(d => ({ id: d.id, title: d.title, status: d.status, chunks: d.chunks.length })));

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

      // Enhanced keyword-based search
      const keywords = question.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      console.log(`Searching for keywords: ${keywords.join(", ")}`);

      const relevantChunks = await prisma.documentChunk.findMany({
        where: {
          ...searchConditions,
          OR: [
            // Exact phrase match (highest priority)
            {
              chunkText: {
                contains: question,
                mode: "insensitive",
              },
            },
            // Individual keyword matches
            ...keywords.map(keyword => ({
              chunkText: {
                contains: keyword,
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
        take: 20, // Get more results for better scoring
      });

      console.log(`Found ${relevantChunks.length} relevant chunks`);

      if (relevantChunks.length === 0) {
        return {
          answer: "I couldn't find any relevant information in your documents to answer this question.",
          sources: [],
          query: question,
        };
      }

      // Score and rank chunks by relevance
      const scoredChunks = relevantChunks.map((chunk) => {
        const text = chunk.chunkText.toLowerCase();
        const questionLower = question.toLowerCase();
        let score = 0;

        // Exact phrase match bonus
        if (text.includes(questionLower)) {
          score += 10;
        }

        // Keyword matching score
        keywords.forEach(keyword => {
          const keywordCount = (text.match(new RegExp(keyword, 'g')) || []).length;
          score += keywordCount * 2;
        });

        // Length penalty for very short chunks
        if (chunk.chunkText.length < 50) {
          score *= 0.5;
        }

        return { ...chunk, relevanceScore: score };
      });

      // Sort by relevance and take top 5
      const topChunks = scoredChunks
        .filter(chunk => chunk.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);

      console.log(`Using top ${topChunks.length} chunks with scores:`,
        topChunks.map(c => ({ title: c.document.title, score: c.relevanceScore })));

      if (topChunks.length === 0) {
        return {
          answer: "I couldn't find any relevant information in your documents to answer this question.",
          sources: [],
          query: question,
        };
      }

      // Prepare context for the LLM
      const context = topChunks
        .map((chunk, index) =>
          `Source ${index + 1} (from ${chunk.document.title}):\n${chunk.chunkText}`
        )
        .join("\n\n");

      // Generate answer using Bedrock
      const answer = await generateAnswer(question, context);

      // Prepare sources for the frontend
      const sources = topChunks.map((chunk) => ({
        id: chunk.id,
        documentId: chunk.documentId,
        documentTitle: chunk.document.title,
        chunkText: chunk.chunkText,
        similarity: chunk.relevanceScore / 100, // Convert to 0-1 range for percentage display
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