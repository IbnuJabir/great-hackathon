"use client";

import { useState } from "react";
import { MessageList, Message } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/trpc/client";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // tRPC mutation for chat queries
  const chatQuery = trpc.chat.query.useMutation();

  // Conversation starters
  const conversationStarters = [
    "What's in my documents?",
    "Summarize the key points from my files",
    "Help me find specific information",
    "Explain technical concepts from my documents"
  ];

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Send query via tRPC
      const data = await chatQuery.mutateAsync({ question: content });

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
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/10 flex flex-col">
        <div className="p-4">
          <Link href="/dashboard/documents">
            <Button variant="outline" className="w-full justify-start gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </Button>
          </Link>
        </div>

        <Separator className="mx-4" />

        <div className="flex-1 p-4">
          <div className="text-sm font-medium text-muted-foreground mb-3">Conversation starters</div>
          <div className="space-y-2">
            {conversationStarters.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(prompt)}
                className="w-full text-left text-sm p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <h1 className="text-lg font-semibold">DocChat</h1>
            </div>
            {isTyping && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                </div>
                <span>Thinking...</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <MessageList messages={messages} isTyping={isTyping} />
        </div>

        {/* Input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={isTyping}
        />
      </div>
    </div>
  );
}