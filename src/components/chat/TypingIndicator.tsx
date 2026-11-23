"use client";

interface TypingIndicatorProps {
  userName?: string;
}

// Displays animated typing bubbles when a counterparty is composing.
export function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground animate-fade-in">
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" />
      </div>
      <span>{userName ? `${userName} is typing...` : "Typing..."}</span>
    </div>
  );
}
