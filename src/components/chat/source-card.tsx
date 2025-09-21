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
    <Card className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-gray-50 border-blue-200">
      <div className="flex items-center space-x-2 mb-3">
        <FileText className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-800">Reference Sources</span>
        <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
          {sources.length} manual{sources.length > 1 ? 's' : ''} referenced
        </Badge>
      </div>

      <div className="space-y-3">
        {sources.map((source, index) => (
          <div
            key={`${source.documentId}-${index}`}
            className="bg-white rounded-lg border border-blue-200 p-3 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <h4 className="text-sm font-semibold text-gray-800">
                  {source.documentTitle}
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {Math.round(source.similarity * 100)}% match
                </Badge>
                <button className="text-blue-500 hover:text-blue-700 transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="bg-gray-50 rounded p-2 border-l-4 border-blue-400">
              <p className="text-sm text-gray-700 leading-relaxed">
                {source.chunkText.length > 200
                  ? `${source.chunkText.substring(0, 200)}...`
                  : source.chunkText
                }
              </p>
            </div>
            <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500">
              <span>📖 Manual Section</span>
              <span>•</span>
              <span>Click to view full context</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-600 bg-white rounded p-2 border border-gray-200">
        💡 <strong>Tip:</strong> Click the source links to view the complete manual section for detailed procedures and diagrams.
      </div>
    </Card>
  );
}