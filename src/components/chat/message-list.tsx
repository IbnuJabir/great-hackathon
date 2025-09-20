"use client";

import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { SourceCard } from "./source-card";
import { User, Bot } from "lucide-react";

export interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  sources?: Array<{
    documentId: string;
    documentTitle: string;
    chunkText: string;
    similarity: number;
  }>;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Welcome to DocChat</h3>
          <p>Ask me anything about your uploaded documents</p>
          <p className="text-sm mt-2">
            I'll search through your manuals and provide accurate answers with sources
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div key={message.id}>
          <Card className={`p-4 ${
            message.type === "user"
              ? "ml-12 bg-blue-50 border-blue-200"
              : "mr-12 bg-white"
          }`}>
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-full ${
                message.type === "user"
                  ? "bg-blue-500"
                  : "bg-gray-500"
              }`}>
                {message.type === "user" ? (
                  <User className="h-4 w-4 text-white" />
                ) : (
                  <Bot className="h-4 w-4 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium">
                    {message.type === "user" ? "You" : "DocChat AI"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          </Card>

          {message.type === "assistant" && message.sources && (
            <div className="mr-12 ml-14">
              <SourceCard sources={message.sources} />
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}