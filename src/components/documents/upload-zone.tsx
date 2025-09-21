"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Loader2 } from "lucide-react";
import { trpc } from "@/trpc/client";

interface UploadZoneProps {
  onUploadComplete: (documentId: string) => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // tRPC mutations and utils
  const utils = trpc.useUtils();
  const getUploadUrl = trpc.documents.getUploadUrl.useMutation();
  const processDocument = trpc.documents.processDocument.useMutation();

  // All files now processed server-side with Bedrock

  // Handle all file uploads via S3 presigned URLs
  const handleFileUploadToS3 = useCallback(
    async (file: File): Promise<string> => {
      // Get presigned upload URL (no client-side text extraction)
      setUploadProgress("Getting upload URL...");
      const uploadData = await getUploadUrl.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        // No extracted text - all processing happens server-side with Bedrock
      });

      const { documentId, uploadUrl } = uploadData;

      // Upload file to S3
      setUploadProgress("Uploading file...");
      const s3Response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!s3Response.ok) {
        throw new Error("Failed to upload file to S3");
      }

      return documentId;
    },
    [getUploadUrl]
  );


  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadProgress("Preparing upload...");

      try {
        const fileSizeMB = Math.round(file.size / 1024 / 1024 * 100) / 100;
        console.log(`Uploading file: ${file.name} (${fileSizeMB}MB)`);

        // All files uploaded via S3 and processed server-side with Bedrock
        setUploadProgress(`Uploading ${file.name} (${fileSizeMB}MB)...`);
        const documentId = await handleFileUploadToS3(file);

        // Start document processing via tRPC
        setUploadProgress("Starting Bedrock processing...");
        await processDocument.mutateAsync({ documentId });

        // Immediately invalidate documents cache for instant UI update
        await utils.documents.listDocuments.invalidate();

        setUploadProgress("Upload complete! Processing in background...");
        onUploadComplete(documentId);

      } catch (error) {
        console.error("Upload error:", error);

        // Provide more specific error messages
        let errorMessage = "Upload failed";
        if (error instanceof Error) {
          if (error.message.includes("Failed to upload file")) {
            errorMessage = "Failed to upload file to S3. Check AWS credentials and bucket access.";
          } else if (error.message.includes("process document")) {
            errorMessage = `Document processing failed: ${error.message}`;
          } else if (error.message.includes("File too large")) {
            errorMessage = "File is too large. Please try again or contact support.";
          } else {
            errorMessage = error.message;
          }
        }

        setUploadProgress(`Error: ${errorMessage}`);
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress("");
        }, 2000);
      }
    },
    [onUploadComplete, handleFileUploadToS3, processDocument, utils]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const file = files[0];

      if (file && (file.type === "application/pdf" || file.type === "text/plain")) {
        handleFileUpload(file);
      } else {
        setUploadProgress("Please upload a PDF or TXT file");
        setTimeout(() => setUploadProgress(""), 3000);
      }
    },
    [handleFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  return (
    <Card className="p-8">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-lg font-medium">{uploadProgress}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium mb-2">
                Drop your manual here or click to upload
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supports PDF and TXT files (small files: up to 10MB client processing, large files: server processing)
              </p>
              <Button
                onClick={() => document.getElementById("file-input")?.click()}
                disabled={isUploading}
              >
                Select File
              </Button>
            </div>
          </div>
        )}

        <input
          id="file-input"
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {uploadProgress && !isUploading && (
        <p className="mt-4 text-center text-sm text-red-500">{uploadProgress}</p>
      )}
    </Card>
  );
}