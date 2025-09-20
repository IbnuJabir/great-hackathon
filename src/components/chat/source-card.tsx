"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";

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

  return (
    <Card className="mt-4 p-4 bg-gray-50">
      <div className="flex items-center space-x-2 mb-3">
        <FileText className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium text-gray-700">Sources</span>
        <Badge variant="secondary" className="text-xs">
          {sources.length} found
        </Badge>
      </div>

      <div className="space-y-3">
        {sources.map((source, index) => (
          <div
            key={`${source.documentId}-${index}`}
            className="border-l-2 border-blue-200 pl-3 py-2"
          >
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-gray-800">
                {source.documentTitle}
              </h4>
              <button className="text-blue-500 hover:text-blue-700">
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs text-gray-600 line-clamp-3">
              {source.chunkText}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}