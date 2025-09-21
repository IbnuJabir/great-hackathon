"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Clock, CheckCircle, AlertCircle, RotateCcw } from "lucide-react";

type DocumentStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

interface Document {
  id: string;
  title: string;
  status: DocumentStatus;
  isProcessed: boolean;
  chunkCount: number;
  processingError?: string | null;
  createdAt: string;
}

interface DocumentListProps {
  refreshTrigger?: string;
}

export function DocumentList({ refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  // Auto-refresh every 5 seconds if there are processing/pending documents
  useEffect(() => {
    const hasProcessingDocs = documents.some(doc =>
      doc.status === "PROCESSING" || doc.status === "PENDING"
    );

    if (hasProcessingDocs) {
      const interval = setInterval(fetchDocuments, 5000); // 5 seconds
      return () => clearInterval(interval);
    }
  }, [documents]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/documents/list");

      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const retryProcessing = async (documentId: string) => {
    try {
      setRetryingIds(prev => new Set(prev).add(documentId));

      const response = await fetch("/api/documents/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to retry processing");
      }

      // Refresh document list
      fetchDocuments();
    } catch (error) {
      console.error("Error retrying document processing:", error);
      alert(`Failed to retry processing: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setRetryingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No documents uploaded yet</p>
          <p className="text-sm mt-2">Upload your first manual to get started</p>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (doc: Document) => {
    const isRetrying = retryingIds.has(doc.id);

    switch (doc.status) {
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready ({doc.chunkCount} chunks)
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Processing...
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending...
          </Badge>
        );
      case "FAILED":
        return (
          <div className="flex items-center space-x-2">
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Failed
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => retryProcessing(doc.id)}
              disabled={isRetrying}
              className="h-7"
            >
              {isRetrying ? (
                <Clock className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3 mr-1" />
              )}
              {isRetrying ? "Retrying..." : "Retry"}
            </Button>
          </div>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-500" />
              <div>
                <h3 className="font-medium">{doc.title}</h3>
                <p className="text-sm text-gray-500">
                  Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                </p>
                {doc.status === "FAILED" && doc.processingError && (
                  <p className="text-sm text-red-600 mt-1">
                    Error: {doc.processingError}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(doc)}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}