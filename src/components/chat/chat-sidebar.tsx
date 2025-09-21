"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  MoreHorizontal,
  Trash2,
  Edit,
  FileText,
  Calendar
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface ChatSidebarProps {
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ currentSessionId, onSessionSelect, onNewChat }: ChatSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const utils = trpc.useUtils();
  const { data: sessions = [], isLoading } = trpc.chatHistory.listSessions.useQuery();

  const deleteSession = trpc.chatHistory.deleteSession.useMutation({
    onSuccess: () => {
      utils.chatHistory.listSessions.invalidate();
    },
  });

  const updateSession = trpc.chatHistory.updateSession.useMutation({
    onSuccess: () => {
      utils.chatHistory.listSessions.invalidate();
      setEditingSessionId(null);
    },
  });

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      await deleteSession.mutateAsync({ sessionId });
      if (currentSessionId === sessionId) {
        onNewChat();
      }
    }
  };

  const handleEditTitle = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  };

  const handleSaveTitle = async () => {
    if (editingSessionId && editingTitle.trim()) {
      await updateSession.mutateAsync({
        sessionId: editingSessionId,
        title: editingTitle.trim(),
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      setEditingSessionId(null);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-r bg-muted/10 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          className="mb-4"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>

        <Separator className="my-2 w-8" />

        <div className="flex-1 w-full">
          {sessions.map((session) => (
            <Button
              key={session.id}
              variant={currentSessionId === session.id ? "secondary" : "ghost"}
              size="icon"
              onClick={() => onSessionSelect(session.id)}
              className="w-full mb-1"
              title={session.title}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r bg-muted/10 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <h2 className="font-semibold text-sm">Chat History</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="h-8 w-8"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Documents Link */}
      <div className="p-4">
        <Link href="/dashboard/documents">
          <Button variant="outline" className="w-full justify-start gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </Button>
        </Link>
      </div>

      <Separator />

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading conversations...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No conversations yet.<br />
            Start a new chat to begin!
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-lg p-3 cursor-pointer transition-colors ${
                  currentSessionId === session.id
                    ? "bg-secondary"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingSessionId === session.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={handleSaveTitle}
                        onKeyDown={handleKeyPress}
                        className="w-full text-sm font-medium bg-background border rounded px-2 py-1"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="text-sm font-medium truncate">
                        {session.title}
                      </h3>
                    )}

                    <div className="text-xs text-muted-foreground mt-1">
                      {session.lastMessage && (
                        <p className="truncate mb-1">
                          {session.lastMessage.substring(0, 60)}
                          {session.lastMessage.length > 60 && "..."}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span>
                          {session.messageCount} message{session.messageCount !== 1 ? "s" : ""}
                        </span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTitle(session.id, session.title);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}