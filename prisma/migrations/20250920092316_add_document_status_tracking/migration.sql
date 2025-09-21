-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."documents" ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "status" "public"."DocumentStatus" NOT NULL DEFAULT 'PENDING';
