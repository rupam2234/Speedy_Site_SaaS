"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, Loader2, Send, Sparkles } from "lucide-react";

type AssistantSource = {
  id: string;
  title: string;
  kind: string;
};

type AssistantAnswer = {
  answer: string;
  citations: string[];
  limitations: string[];
  sources: AssistantSource[];
};

type ChatMessage = {
  id: string;
  role: "question" | "answer";
  content: string;
  sources?: AssistantSource[];
  limitations?: string[];
};

const SUGGESTED_QUESTIONS = [
  "What should I change first?",
  "How can I verify this fix?",
  "What evidence supports this diagnosis?",
];

export default function IssueAssistant({
  siteId,
  issueId,
}: {
  siteId: string;
  issueId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const questionId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: questionId, role: "question", content: trimmed },
    ]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rum/issues/${issueId}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, question: trimmed }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to answer this question.");
      }
      const result = body.data as AssistantAnswer;
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "answer",
          content: result.answer,
          sources: result.sources.filter((source) =>
            result.citations.includes(source.id),
          ),
          limitations: result.limitations,
        },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to answer this question.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <div className="rounded-sm border border-primary/15 bg-primary-foreground p-4 dark:bg-secondary-background">
      <div className="flex items-start gap-2">
        <span className="rounded-sm bg-primary/10 p-1.5 text-primary">
          <Sparkles className="size-4" />
        </span>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary/75">
            Ask about this issue
          </h3>
          <p className="mt-1 text-xs text-primary/60">
            Answers use this issue&apos;s measured evidence and approved
            WordPress remediation guidance.
          </p>
        </div>
      </div>

      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void ask(suggestion)}
              className="rounded-sm border border-primary/15 px-3 py-1.5 text-xs text-primary/75 transition-colors hover:bg-primary/5"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="mt-4 space-y-3">
          {messages.map((message) =>
            message.role === "question" ? (
              <div
                key={message.id}
                className="ml-auto max-w-[85%] rounded-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
              >
                {message.content}
              </div>
            ) : (
              <div
                key={message.id}
                className="max-w-[95%] rounded-sm border border-primary/10 bg-primary/5 px-3 py-3"
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-primary/80">
                  {message.content}
                </p>
                {message.sources?.length ? (
                  <div className="mt-3 border-t border-primary/10 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary/55">
                      Sources
                    </p>
                    <ul className="mt-1 space-y-1 text-[11px] text-primary/65">
                      {message.sources.map((source) => (
                        <li key={source.id}>
                          {source.title} ({source.kind.replaceAll("_", " ")})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {message.limitations?.length ? (
                  <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                    {message.limitations.join(" ")}
                  </div>
                ) : null}
              </div>
            ),
          )}
        </div>
      )}

      {error ? (
        <div className="mt-3 flex items-start gap-2 text-xs text-red-600 dark:text-red-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2">
        <label className="sr-only" htmlFor={`question-${issueId}`}>
          Question about this issue
        </label>
        <textarea
          id={`question-${issueId}`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Ask how to fix or verify this issue"
          className="min-h-16 flex-1 resize-none rounded-sm border border-primary/15 bg-background px-3 py-2 text-sm outline-none placeholder:text-primary/40 focus:border-primary/40"
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Send question"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </form>
    </div>
  );
}

