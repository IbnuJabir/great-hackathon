-- CreateTable
CREATE TABLE "public"."documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkText" TEXT NOT NULL,
    "embedding" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_s3Key_key" ON "public"."documents"("s3Key");

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
