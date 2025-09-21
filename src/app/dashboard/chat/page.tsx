"use client";

import { useState } from "react";
import { MessageList, Message } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/trpc/client";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // tRPC mutation for chat queries
  const chatQuery = trpc.chat.query.useMutation();

  // Quick action prompts for manufacturing technicians
  const quickActions = [
    {
      icon: "🔧",
      title: "Troubleshooting",
      prompts: [
        "How do I troubleshoot error code 001?",
        "What are the common failure points?",
        "Diagnostic procedures for malfunction",
      ]
    },
    {
      icon: "⚙️",
      title: "Maintenance",
      prompts: [
        "What is the maintenance schedule?",
        "How do I perform routine maintenance?",
        "Preventive maintenance checklist",
      ]
    },
    {
      icon: "📋",
      title: "Safety",
      prompts: [
        "What are the safety procedures?",
        "Emergency shutdown procedures",
        "Personal protective equipment requirements",
      ]
    },
    {
      icon: "📖",
      title: "Operating Procedures",
      prompts: [
        "How do I start up the equipment?",
        "Normal operating procedures",
        "Step-by-step operation guide",
      ]
    }
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">🏭 Manufacturing Assistant</h1>
            <p className="text-gray-600">
              Get instant answers from your technical manuals. Ask questions or use quick actions below.
            </p>
          </div>
          <Link href="/dashboard/documents">
            <Button variant="outline" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <Upload className="h-4 w-4" />
              <span>Manage Documents</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Actions Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-sm text-gray-700">Quick Actions</h3>
            <div className="space-y-3">
              {quickActions.map((category, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{category.icon}</span>
                    <span className="font-medium text-xs text-gray-600">{category.title}</span>
                  </div>
                  <div className="space-y-1">
                    {category.prompts.map((prompt, promptIdx) => (
                      <button
                        key={promptIdx}
                        onClick={() => handleQuickAction(prompt)}
                        className="w-full text-left text-xs p-2 rounded bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-sm font-medium">Assistant Ready</span>
                </div>
                {isTyping && (
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <div className="animate-pulse">Analyzing documents...</div>
                  </div>
                )}
              </div>
            </div>
            <MessageList messages={messages} />
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={isTyping}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}