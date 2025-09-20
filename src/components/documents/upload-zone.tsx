"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Loader2 } from "lucide-react";

interface UploadZoneProps {
  onUploadComplete: (documentId: string) => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadProgress("Preparing upload...");

      try {
        // Step 1: Get presigned upload URL
        const uploadResponse = await fetch("/api/documents/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          }),
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || "Failed to prepare upload");
        }

        const { documentId, uploadUrl } = await uploadResponse.json();

        // Step 2: Upload file to S3
        setUploadProgress("Uploading file...");
        const s3Response = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!s3Response.ok) {
          throw new Error("Failed to upload file");
        }

        // Step 3: Start document processing
        setUploadProgress("Processing document...");
        const ingestResponse = await fetch("/api/documents/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        });

        if (!ingestResponse.ok) {
          const error = await ingestResponse.json();
          throw new Error(error.error || "Failed to process document");
        }

        setUploadProgress("Upload complete!");
        onUploadComplete(documentId);

      } catch (error) {
        console.error("Upload error:", error);
        setUploadProgress(
          `Error: ${error instanceof Error ? error.message : "Upload failed"}`
        );
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress("");
        }, 2000);
      }
    },
    [onUploadComplete]
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
                Supports PDF and TXT files up to 10MB
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