"use client";

import { useState } from "react";
import { PackageCheck, Send, User } from "lucide-react";

interface OrderData {
  orderNumber: string;
  plan: string;
  startDate: string;
  nextOptimization: string;
  manager: {
    name: string;
    avatarUrl?: string;
  };
}

interface ChatMessage {
  id: string;
  sender: "manager" | "you";
  name: string;
  content: string;
  timestamp: string;
}

const MOCK_ORDER: OrderData = {
  orderNumber: "WP-20481",
  plan: "Managed WordPress — Growth",
  startDate: "Jan 14, 2026",
  nextOptimization: "Jul 22, 2026",
  manager: {
    name: "Priya Nair",
  },
};

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "manager",
    name: "Priya Nair",
    content:
      "Hi! I ran the first optimization pass on your site yesterday — page load dropped by about 40%.",
    timestamp: "Yesterday, 4:12 PM",
  },
  {
    id: "2",
    sender: "you",
    name: "You",
    content: "That's great to hear, thank you! Anything you need from me?",
    timestamp: "Yesterday, 4:20 PM",
  },
  {
    id: "3",
    sender: "manager",
    name: "Priya Nair",
    content:
      "Not right now. Next check-in is scheduled for July 22 — I'll follow up with a full report then.",
    timestamp: "Yesterday, 4:22 PM",
  },
];

function OrderStatusPill({
  status,
}: {
  status: "active" | "paused" | "pending";
}) {
  const styles: Record<typeof status, string> = {
    active:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20",
    paused:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20",
    pending:
      "bg-primary/15 text-primary dark:text-primary-foreground/80 dark:bg-primary/20",
  };

  const labels: Record<typeof status, string> = {
    active: "Active",
    paused: "Paused",
    pending: "Pending",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}

export default function ManagedOrderDashboard() {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [draft, setDraft] = useState("");

  const sendMessage = () => {
    if (!draft.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: "you",
        name: "You",
        content: draft.trim(),
        timestamp: "Just now",
      },
    ]);
    setDraft("");
  };

  return (
    <div className="min-h-screen fade-in-10 duration-500">
      <div className="mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 dark:bg-primary/80">
              <PackageCheck
                className="h-5 w-5 text-primary/80 dark:text-primary-foreground/80"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">
                Managed WordPress Optimization
              </p>
              <p className="text-xs text-primary/60">
                Order #{MOCK_ORDER.orderNumber}
              </p>
            </div>
          </div>
          <OrderStatusPill status="active" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Order data */}
          <div className="lg:col-span-1 rounded-sm border border-primary/10 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-primary/50">
              Order details
            </p>
            <dl className="mt-4 flex flex-col gap-4">
              <div>
                <dt className="text-xs text-primary/50">Plan</dt>
                <dd className="text-sm font-medium text-primary">
                  {MOCK_ORDER.plan}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-primary/50">Start date</dt>
                <dd className="text-sm font-medium text-primary">
                  {MOCK_ORDER.startDate}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-primary/50">Next optimization</dt>
                <dd className="text-sm font-medium text-primary">
                  {MOCK_ORDER.nextOptimization}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-primary/50">Client manager</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
                    <User
                      className="h-3.5 w-3.5 text-primary/70"
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="text-sm font-medium text-primary">
                    {MOCK_ORDER.manager.name}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Chat */}
          <div className="lg:col-span-2 flex flex-col rounded-sm border border-primary/10">
            <div className="border-b border-primary/10 px-5 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-primary/50">
                Chat with your client manager
              </p>
            </div>

            <div className="flex max-h-96 flex-col gap-4 overflow-y-auto px-5 py-4">
              {messages.map((msg) => {
                const isYou = msg.sender === "you";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 ${isYou ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        isYou
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="px-1 text-[11px] text-primary/40">
                      {isYou ? "" : `${msg.name} · `}
                      {msg.timestamp}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 border-t border-primary/10 px-4 py-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Write a message..."
                className="flex-1 rounded-full border border-primary/10 bg-transparent px-4 py-2 text-sm text-primary placeholder:text-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                onClick={sendMessage}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90"
              >
                <Send className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
