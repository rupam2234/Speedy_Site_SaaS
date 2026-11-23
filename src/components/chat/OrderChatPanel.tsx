"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, RefreshCw, Shield, Users } from "lucide-react";
import { browserClient } from "@/lib/db/browser";
import { useRealtimeChat } from "@/lib/chat/realtime";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import type { ChannelType, OrderConversation, OrderMessage, TypingIndicatorState } from "@/lib/chat/types";

interface OrderChatPanelProps {
  orderId: string;
  channelType: ChannelType;
  title?: string;
  subtitle?: string;
  className?: string;
  isReadOnlyOverride?: boolean;
}

// Full-featured chat container with realtime sync, role badges, and read-only gating.
export function OrderChatPanel({
  orderId,
  channelType,
  title,
  subtitle,
  className = "",
  isReadOnlyOverride,
}: OrderChatPanelProps) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [conversation, setConversation] = useState<OrderConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [currentUserEmail, setCurrentUserEmail] = useState<string | undefined>();
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [activeTyping, setActiveTyping] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch current user
  useEffect(() => {
    browserClient.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
        setCurrentUserEmail(data.user.email || undefined);
      }
    });
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  };

  // 2. Mark unread messages as read
  const markAsRead = useCallback(async (convoId: string) => {
    try {
      await fetch("/api/chat/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convoId }),
      });
    } catch {
      // Non-blocking error
    }
  }, []);

  // 3. Load initial messages
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/messages?orderId=${orderId}&channelType=${channelType}&limit=50`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to load messages");

      setConversation(data.conversation);
      setMessages(data.messages || []);
      setHasMore((data.messages || []).length === 50);
      setIsReadOnly(Boolean(isReadOnlyOverride ?? data.isReadOnly));

      if (data.conversation?.id) {
        markAsRead(data.conversation.id);
      }

      setTimeout(() => scrollToBottom("auto"), 100);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId, channelType, isReadOnlyOverride, markAsRead]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // 4. Load older messages (pagination)
  const loadOlderMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);

    const oldest = messages[0].createdAt;
    try {
      const res = await fetch(
        `/api/chat/messages?orderId=${orderId}&channelType=${channelType}&limit=50&before=${encodeURIComponent(
          oldest
        )}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const older: OrderMessage[] = data.messages || [];
      setHasMore(older.length === 50);
      setMessages((prev) => [...older, ...prev]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  // 5. Realtime listener
  const handleNewMessage = useCallback(
    (newMsg: OrderMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      if (conversation?.id) {
        markAsRead(conversation.id);
      }
      setTimeout(() => scrollToBottom("smooth"), 100);
    },
    [conversation?.id, markAsRead]
  );

  const handleMessageUpdate = useCallback((updatedMsg: OrderMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
    );
  }, []);

  const handleTypingEvent = useCallback(
    (typing: TypingIndicatorState) => {
      if (typing.userId === currentUserId) return;
      if (typing.isTyping) {
        setActiveTyping(typing.userName);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setActiveTyping(null), 3000);
      } else {
        setActiveTyping(null);
      }
    },
    [currentUserId]
  );

  const { broadcastTyping } = useRealtimeChat({
    conversationId: conversation?.id || null,
    currentUserId,
    onNewMessage: handleNewMessage,
    onMessageUpdate: handleMessageUpdate,
    onTypingChange: handleTypingEvent,
  });

  // 6. Send message handler
  const handleSendMessage = async (body: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          channelType,
          body,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to send message");
        return false;
      }

      const created: OrderMessage = data.message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === created.id)) return prev;
        return [...prev, created];
      });

      setTimeout(() => scrollToBottom("smooth"), 100);
      return true;
    } catch (err: any) {
      toast.error(err.message || "Could not send message");
      return false;
    }
  };

  const channelLabel =
    channelType === "client" ? "Customer Communication" : "Admin Backchannel";

  return (
    <div className={`flex flex-col rounded-xl border bg-card text-card-foreground shadow-xs ${className}`}>
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-2">
          {channelType === "client" ? (
            <Users className="h-4 w-4 text-primary" />
          ) : (
            <Shield className="h-4 w-4 text-amber-500" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{title || channelLabel}</h3>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                  channelType === "client"
                    ? "bg-primary/10 text-primary"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {channelType}
              </span>
              {isReadOnly && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Read-Only
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <button
          onClick={loadMessages}
          title="Refresh messages"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Message List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[460px]"
      >
        {hasMore && (
          <div className="flex justify-center pb-2">
            <button
              onClick={loadOlderMessages}
              disabled={loadingMore}
              className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {loadingMore ? "Loading older messages..." : "Load earlier messages"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
            Loading dialogue stream...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {channelType === "client"
                ? "Start the conversation between customer and performance expert."
                : "Internal staff dialogue between assigned expert and platform administrators."}
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isSelf={Boolean(currentUserId && m.senderId === currentUserId)}
            />
          ))
        )}

        {activeTyping && <TypingIndicator userName={activeTyping} />}
      </div>

      {/* Panel Footer / Composer */}
      <div className="border-t p-3 bg-muted/10">
        <ChatInput
          onSendMessage={handleSendMessage}
          onTyping={(isTyping) =>
            broadcastTyping(currentUserEmail?.split("@")[0] || "User", isTyping)
          }
          isReadOnly={isReadOnly}
          placeholder={
            channelType === "client"
              ? "Message your performance expert..."
              : "Post internal administrative note..."
          }
        />
      </div>
    </div>
  );
}
