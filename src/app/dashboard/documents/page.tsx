"use client";

import { useState } from "react";
import { UploadZone } from "@/components/documents/upload-zone";
import { DocumentList } from "@/components/documents/document-list";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DocumentsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState<string>("");
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📚 Document Management</h1>
            <p className="text-gray-600">
              Upload technical manuals and documentation for AI-powered search
            </p>
          </div>
          <Link href="/dashboard/chat">
            <Button className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Start Chatting</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Upload New Document</h2>
          <UploadZone
            onUploadComplete={(documentId) => {
              // Trigger refresh of document list
              setRefreshTrigger(documentId);
            }}
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
          <DocumentList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}