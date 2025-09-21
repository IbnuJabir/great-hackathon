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
  const uploadLargeFile = trpc.documents.uploadLargeFile.useMutation();
  const processDocument = trpc.documents.processDocument.useMutation();

  // File size threshold for determining upload method (10MB)
  const FILE_SIZE_THRESHOLD = 10 * 1024 * 1024;

  // Extract text from PDF using PDF.js (dynamic import)
  const extractPdfText = useCallback(async (file: File): Promise<string> => {
    try {
      setUploadProgress("Extracting text from PDF...");

      // Dynamic import to avoid SSR issues
      const pdfjs = await import("pdfjs-dist");

      // Configure worker on client side only
      if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item): item is { str: string } => "str" in item)
          .map((item) => item.str)
          .join(" ");

        if (pageText.trim()) {
          fullText += pageText + "\n";
        }
      }

      if (!fullText.trim()) {
        throw new Error("No text content found in PDF");
      }

      console.log(`Extracted ${fullText.length} characters from PDF`);
      return fullText.trim();
    } catch (error) {
      console.error("PDF text extraction failed:", error);
      throw new Error("Failed to extract text from PDF. Please ensure it's a text-based PDF.");
    }
  }, []);

  // Convert file to base64 for server upload
  const fileToBase64 = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:type/subtype;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }, []);

  // Server-side upload for large files
  const handleLargeFileUpload = useCallback(
    async (file: File) => {
      setUploadProgress("Converting file for server upload...");

      try {
        // Convert file to base64
        const fileData = await fileToBase64(file);

        // Upload directly to server
        setUploadProgress("Uploading large file to server...");
        const result = await uploadLargeFile.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData,
        });

        return result.documentId;
      } catch (error) {
        console.error("Large file upload error:", error);
        throw error;
      }
    },
    [uploadLargeFile, fileToBase64]
  );

  // Client-side upload for small files (existing logic)
  const handleSmallFileUpload = useCallback(
    async (file: File) => {
      let extractedText: string | undefined;

      // Try client-side text extraction for PDFs
      if (file.type === "application/pdf") {
        try {
          extractedText = await extractPdfText(file);
        } catch (error) {
          console.warn("Client-side PDF extraction failed, will use server-side fallback:", error);
          // Continue without extracted text - server will handle it
        }
      }

      // Get presigned upload URL via tRPC
      setUploadProgress("Getting upload URL...");
      const uploadData = await getUploadUrl.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        extractedText,
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
    [extractPdfText, getUploadUrl]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadProgress("Preparing upload...");

      try {
        let documentId: string;

        // Determine upload method based on file size
        if (file.size > FILE_SIZE_THRESHOLD) {
          // Use server-side upload for large files
          setUploadProgress(`Large file detected (${Math.round(file.size / 1024 / 1024)}MB), using server upload...`);
          documentId = await handleLargeFileUpload(file);
        } else {
          // Use client-side upload for small files
          setUploadProgress("Small file, using client upload...");
          try {
            documentId = await handleSmallFileUpload(file);
          } catch (error) {
            // Fallback to server-side upload if client-side fails
            console.warn("Client-side upload failed, falling back to server-side:", error);
            setUploadProgress("Client upload failed, trying server upload...");
            documentId = await handleLargeFileUpload(file);
          }
        }

        // Start document processing via tRPC
        setUploadProgress("Starting processing...");
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
          } else if (error.message.includes("extract text")) {
            errorMessage = `PDF processing failed: ${error.message}`;
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
    [onUploadComplete, handleSmallFileUpload, handleLargeFileUpload, processDocument, utils, FILE_SIZE_THRESHOLD]
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