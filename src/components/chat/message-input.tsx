"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { VoiceRecorder } from "./voice-recorder";

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
  onVoiceError?: (error: string) => void;
}

export function MessageInput({ onSendMessage, disabled, onVoiceError }: MessageInputProps) {
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

  const handleVoiceTranscription = async (transcriptText: string) => {
    if (transcriptText.trim()) {
      // Option 1: Insert transcribed text into the input field for user review
      setMessage(prev => prev + (prev ? ' ' : '') + transcriptText.trim());

      // Option 2: Auto-send the transcribed message (uncomment to enable)
      // try {
      //   setIsLoading(true);
      //   await onSendMessage(transcriptText.trim());
      // } catch (error) {
      //   console.error("Error sending voice message:", error);
      // } finally {
      //   setIsLoading(false);
      // }
    }
  };

  const handleVoiceError = (error: string) => {
    console.error("Voice recording error:", error);
    if (onVoiceError) {
      onVoiceError(error);
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message Claude..."
                className="min-h-[52px] max-h-32 resize-none pr-20 py-3 text-sm border-2 focus:border-ring"
                disabled={disabled || isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <VoiceRecorder
                  onTranscriptionComplete={handleVoiceTranscription}
                  onError={handleVoiceError}
                  disabled={disabled || isLoading}
                  maxDuration={300} // 5 minutes
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!message.trim() || isLoading || disabled}
                  className="h-8 w-8 p-0 rounded-md"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line, or use voice recording
        </p>
      </div>
    </div>
  );
}