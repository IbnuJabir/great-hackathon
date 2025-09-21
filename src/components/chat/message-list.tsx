"use client";

import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SourceCard } from "./source-card";
import { User, Sparkles } from "lucide-react";

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
  isTyping?: boolean;
}

export function MessageList({ messages, isTyping }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">How can I help you today?</h3>
          <p className="text-muted-foreground">
            I can help you find information, answer questions, and provide insights based on your documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {messages.map((message) => (
          <div key={message.id} className="space-y-4">
            <div className="flex gap-4">
              <Avatar className="w-8 h-8 mt-1">
                <AvatarFallback className={message.type === "user" ? "bg-blue-500 text-white" : "bg-gradient-to-br from-orange-400 to-red-400 text-white"}>
                  {message.type === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {message.type === "user" ? "You" : "DocChat"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            </div>

            {message.type === "assistant" && message.sources && (
              <div className="ml-12">
                <SourceCard sources={message.sources} />
              </div>
            )}
          </div>
        ))}

        {/* Thinking Animation */}
        {isTyping && (
          <div className="flex gap-4">
            <Avatar className="w-8 h-8 mt-1">
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-400 text-white">
                <Sparkles className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">DocChat</span>
              </div>

              <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg border">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                </div>
                <span className="text-sm text-muted-foreground ml-2">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}