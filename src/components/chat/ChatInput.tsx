"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Eye, Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (body: string) => Promise<boolean>;
  onTyping?: (isTyping: boolean) => void;
  isReadOnly?: boolean;
  placeholder?: string;
}

// Composer component with keyboard shortcuts and read-only lockdown mode.
export function ChatInput({
  onSendMessage,
  onTyping,
  isReadOnly = false,
  placeholder = "Type your message...",
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting || isReadOnly) return;

    setSubmitting(true);
    try {
      const ok = await onSendMessage(trimmed);
      if (ok) {
        setText("");
        if (onTyping) onTyping(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isReadOnly) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
        <Eye className="h-4 w-4 shrink-0" />
        <span>Read-only inspection; intervention disabled</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-2 rounded-xl border bg-background p-2 focus-within:ring-1 focus-within:ring-ring">
      <textarea
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
        maxLength={5000}
        disabled={submitting}
        className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-hidden placeholder:text-muted-foreground disabled:opacity-50"
      />

      <div className="flex items-center justify-between border-t pt-2 px-1 text-xs text-muted-foreground">
        <span>
          {text.length > 4000 ? `${text.length}/5000` : "Shift + Enter for new line"}
        </span>

        <button
          onClick={handleSend}
          disabled={!text.trim() || submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Send className="h-3 w-3" />
          <span>{submitting ? "Sending..." : "Send"}</span>
        </button>
      </div>
    </div>
  );
}
