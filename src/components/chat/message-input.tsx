"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isLoading || disabled) return;

    const currentMessage = message.trim();
    setMessage("");
    setIsLoading(true);

    try {
      await onSendMessage(currentMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t bg-white p-4">
      <div className="flex space-x-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask a question about your documents..."
          className="flex-1 min-h-[60px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled || isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          disabled={!message.trim() || isLoading || disabled}
          className="px-6"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}