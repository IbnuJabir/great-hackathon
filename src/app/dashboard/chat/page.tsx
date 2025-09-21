"use client";

import { useState, useEffect } from "react";
import { MessageList, Message } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ConversationStarters } from "@/components/chat/conversation-starters";
import { trpc } from "@/trpc/client";
import { ModeToggle } from "@/components/ui/theme-icon";
import Image from "next/image";
import logo from '@/assets/Chatbot_Logo_No_circule.png';
import { toast } from "sonner";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // tRPC mutations and queries
  const chatQuery = trpc.chat.query.useMutation();
  const createSession = trpc.chatHistory.createSession.useMutation();
  const saveMessage = trpc.chatHistory.saveMessage.useMutation();
  const { data: sessionData } = trpc.chatHistory.getSession.useQuery(
    { sessionId: currentSessionId! },
    { enabled: !!currentSessionId }
  );

  // Load session messages when session changes
  useEffect(() => {
    if (sessionData) {
      setMessages(sessionData.messages);
    }
  }, [sessionData]);

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleVoiceError = (error: string) => {
    console.error("Voice error:", error);
    toast.error(error);
  };

  const handleSendMessage = async (content: string) => {
    try {
      // Create session if none exists
      let sessionId = currentSessionId;
      if (!sessionId) {
        const newSession = await createSession.mutateAsync({});
        sessionId = newSession.id;
        setCurrentSessionId(sessionId);
      }

      // Add user message to UI
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      // Save user message to database
      await saveMessage.mutateAsync({
        sessionId: sessionId!,
        role: "USER",
        content,
      });

      // Send query via tRPC
      const data = await chatQuery.mutateAsync({ question: content });

      // Add assistant message to UI
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: "assistant",
        content: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Save assistant message to database
      await saveMessage.mutateAsync({
        sessionId: sessionId!,
        role: "ASSISTANT",
        content: data.answer,
        sources: data.sources,
      });

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

  return (
    <div className="flex h-screen bg-background">
      {/* Chat Sidebar */}
      <ChatSidebar
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src={logo}
                alt="DocChat Logo"
                width={34}
                height={34}
                className="rounded"
              />
              <h1 className="text-lg font-semibold">DocChat</h1>
            </div>
            <div className="flex items-center gap-2">
              <ModeToggle />
            </div>
          </div>
        </div>

        {/* Messages or Conversation Starters */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <ConversationStarters onStarterClick={handleSendMessage} />
          ) : (
            <MessageList messages={messages} isTyping={isTyping} />
          )}
        </div>

        {/* Input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={isTyping}
          onVoiceError={handleVoiceError}
        />
      </div>
    </div>
  );
}