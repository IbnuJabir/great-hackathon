"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";
import { trpc } from "@/trpc/client";

interface Source {
  documentId: string;
  documentTitle: string;
  chunkText: string;
  similarity: number;
}

interface SourceCardProps {
  sources: Source[];
}

export function SourceCard({ sources }: SourceCardProps) {
  if (sources.length === 0) return null;

  const utils = trpc.useUtils();

  const handleDocumentClick = async (documentId: string) => {
    try {
      const result = await utils.documents.getDocumentUrl.fetch({ documentId });
      window.open(result.downloadUrl, '_blank');
    } catch (error) {
      console.error('Failed to get document URL:', error);
    }
  };

  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Sources</span>
        <Badge variant="secondary" className="text-xs">
          {sources.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {sources.map((source, index) => (
          <div
            key={`${source.documentId}-${index}`}
            className="bg-background rounded-lg border p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <h4 className="text-sm font-medium truncate">
                  {source.documentTitle}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {Math.round(source.similarity * 100)}%
                </Badge>
                <button
                  onClick={() => handleDocumentClick(source.documentId)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title="Open document"
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="bg-muted/50 rounded p-3 border-l-2 border-primary/20">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {source.chunkText.length > 200
                  ? `${source.chunkText.substring(0, 200)}...`
                  : source.chunkText
                }
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}