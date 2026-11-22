import { useEffect, useRef } from "react";
import { browserClient } from "@/lib/db/browser";
import type { OrderMessage, TypingIndicatorState } from "./types";

interface UseRealtimeChatProps {
  conversationId: string | null;
  currentUserId?: string;
  onNewMessage?: (message: OrderMessage) => void;
  onMessageUpdate?: (message: OrderMessage) => void;
  onTypingChange?: (state: TypingIndicatorState) => void;
}

// Manages Supabase Realtime subscriptions and typing indicators for a conversation.
export function useRealtimeChat({
  conversationId,
  currentUserId,
  onNewMessage,
  onMessageUpdate,
  onTypingChange,
}: UseRealtimeChatProps) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!conversationId) return;

    const channelName = `order-convo:${conversationId}`;
    const channel = browserClient.channel(channelName);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (onNewMessage && payload.new) {
            onNewMessage(payload.new as OrderMessage);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "order_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (onMessageUpdate && payload.new) {
            onMessageUpdate(payload.new as OrderMessage);
          }
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (onTypingChange && payload.payload) {
          onTypingChange(payload.payload as TypingIndicatorState);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [conversationId, onNewMessage, onMessageUpdate, onTypingChange]);

  const broadcastTyping = (userName: string, isTyping: boolean) => {
    if (!channelRef.current || !currentUserId) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId: currentUserId,
        userName,
        isTyping,
      },
    });
  };

  return { broadcastTyping };
}
