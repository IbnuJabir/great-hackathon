"use client";

import { useState } from "react";
import { MessageList, Message } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { Card } from "@/components/ui/card";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Send query to API
      const response = await fetch("/api/chat/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: content }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: "assistant",
        content: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Error sending message:", error);

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: "assistant",
        content: "Sorry, I encountered an error processing your question. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI Document Chat</h1>
        <p className="text-gray-600">
          Ask questions about your uploaded technical manuals and get instant answers
        </p>
      </div>

      <Card className="h-[600px] flex flex-col">
        <MessageList messages={messages} />
        <MessageInput onSendMessage={handleSendMessage} />
      </Card>
    </div>
  );
}