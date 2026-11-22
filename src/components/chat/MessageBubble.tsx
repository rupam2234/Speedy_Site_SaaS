"use client";

import { Check, CheckCheck, Shield, Sparkles, User, Wrench } from "lucide-react";
import type { OrderMessage } from "@/lib/chat/types";

interface MessageBubbleProps {
  message: OrderMessage;
  isSelf: boolean;
}

// Renders chat bubble with role badges and read receipt status.
export function MessageBubble({ message, isSelf }: MessageBubbleProps) {
  const isRead = Boolean(message.readAt);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            <Shield className="h-2.5 w-2.5" /> Admin
          </span>
        );
      case "expert":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
            <Wrench className="h-2.5 w-2.5" /> Expert
          </span>
        );
      case "system":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
            <Sparkles className="h-2.5 w-2.5" /> System
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <User className="h-2.5 w-2.5" /> Customer
          </span>
        );
    }
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex flex-col ${isSelf ? "items-end" : "items-start"} space-y-1`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
        <span className="font-medium text-foreground">
          {isSelf ? "You" : message.senderEmail?.split("@")[0] || "User"}
        </span>
        {getRoleBadge(message.senderRole)}
        <span>{formattedTime}</span>
      </div>

      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
          isSelf
            ? "bg-primary text-primary-foreground rounded-br-xs"
            : "bg-muted/80 text-foreground border rounded-bl-xs"
        }`}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>

        {isSelf && (
          <div className="mt-1 flex justify-end items-center gap-1 text-[10px] text-primary-foreground/75">
            {isRead ? (
              <span className="inline-flex items-center gap-0.5">
                <CheckCheck className="h-3 w-3 text-primary-foreground" /> Read
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5">
                <Check className="h-3 w-3" /> Sent
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
