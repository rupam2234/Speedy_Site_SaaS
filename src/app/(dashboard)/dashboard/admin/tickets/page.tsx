"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import {
  Send,
  LoaderCircle,
  User,
  Search,
  MessageSquare,
} from "lucide-react";
import { SpeedySiteTickets, TicketMessages } from "@/app/api";

export default function AdminTicketsPage() {
  const user = useSupabaseUser();

  const [tickets, setTickets] = useState<SpeedySiteTickets[] | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SpeedySiteTickets | null>(null);
  const [messages, setMessages] = useState<TicketMessages[]>([]);
  const [messageInput, setMessageInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets/get");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      const list: SpeedySiteTickets[] = json.tickets?.response ?? [];
      setTickets(list);
      if (list.length > 0 && !selectedTicket) {
        setSelectedTicket(list[0]);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load tickets");
      setTickets([]);
    }
  }, [selectedTicket]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadMessages = useCallback(async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch("/api/tickets/messages/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId, offset: 0 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setMessages(json.data ?? []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load messages");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTicket?.id) {
      loadMessages(selectedTicket.id);
    }
  }, [selectedTicket?.id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket?.id || !messageInput.trim() || sending) return;

    setSending(true);
    const content = messageInput.trim();
    try {
      const res = await fetch("/api/tickets/messages/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          message: content,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);

      setMessageInput("");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          ticket_id: selectedTicket.id,
          user_id: user?.id ?? "",
          sender_name: user?.user_metadata?.name || "Speedy Site Support",
          sender_role: "admin",
          message: content,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (status: "open" | "pending" | "closed") => {
    if (!selectedTicket?.id) return;
    try {
      const res = await fetch("/api/tickets/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);

      toast.success(`Ticket marked as ${status}`);
      setSelectedTicket((prev) => (prev ? { ...prev, status } : prev));
      setTickets((prev) =>
        (prev ?? []).map((t) => (t.id === selectedTicket.id ? { ...t, status } : t))
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  const filteredTickets = (tickets ?? []).filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search.trim()) {
      const query = search.toLowerCase();
      const subject = (t.subject || "").toLowerCase();
      const msg = (t.message || "").toLowerCase();
      return subject.includes(query) || msg.includes(query);
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Support Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Triage incoming customer inquiries, diagnostic questions, and support tickets.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 border rounded-lg p-1 bg-muted/40 self-start">
          {[
            { id: "all", label: "All" },
            { id: "open", label: "Open" },
            { id: "pending", label: "Pending" },
            { id: "closed", label: "Closed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 border rounded-2xl overflow-hidden bg-card shadow-sm">
        {/* Left Column: Ticket List */}
        <div className="lg:col-span-4 border-r flex flex-col h-full bg-muted/10">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y">
            {tickets === null ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No tickets match your filter.
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-3.5 cursor-pointer transition-colors space-y-1.5 ${
                      isSelected ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-foreground truncate">{t.subject}</span>
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                          t.status === "open"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : t.status === "pending"
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {t.message}
                    </p>
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1">
                      <span>{t.created_at ? new Date(t.created_at).toLocaleDateString() : ""}</span>
                      {t.related_order && (
                        <span className="font-mono text-[9px]">Order: {t.related_order.slice(0, 8)}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation */}
        <div className="lg:col-span-8 flex flex-col h-full bg-background">
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3 bg-card">
                <div>
                  <h2 className="text-base font-bold text-foreground">{selectedTicket.subject}</h2>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>Created: {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : ""}</span>
                    {selectedTicket.related_order && (
                      <span className="font-mono text-[11px]">Related Order: {selectedTicket.related_order}</span>
                    )}
                  </div>
                </div>

                {/* Status Switcher */}
                <div className="flex items-center gap-1.5 border rounded-lg p-1 bg-muted/40">
                  {(["open", "pending", "closed"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(s)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded capitalize transition-colors ${
                        selectedTicket.status === s
                          ? "bg-background text-foreground shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Original Ticket Description */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <User className="w-3.5 h-3.5" /> Customer Inquiry
                    </span>
                    <span>{selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : ""}</span>
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.message}
                  </div>
                </div>

                {loadingMessages ? (
                  <div className="text-center py-6 text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <LoaderCircle className="w-4 h-4 animate-spin" /> Loading discussion...
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isStaff = m.sender_role === "admin" || m.sender_role === "expert";
                    return (
                      <div
                        key={m.id || idx}
                        className={`flex flex-col space-y-1 max-w-[85%] ${
                          isStaff ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
                          <span className="font-semibold text-foreground">{m.sender_name ?? "Staff"}</span>
                          {isStaff && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-primary/10 text-primary">
                              {m.sender_role === "admin" ? "Admin" : "Expert"}
                            </span>
                          )}
                          <span>&bull;</span>
                          <span>{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                        </div>
                        <div
                          className={`p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                            isStaff
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "bg-muted text-foreground rounded-tl-none border"
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t bg-card flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type your reply to customer..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border rounded-xl bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sending}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
              <MessageSquare className="w-10 h-10 stroke-1" />
              <p className="text-sm font-medium">Select a ticket to view conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
