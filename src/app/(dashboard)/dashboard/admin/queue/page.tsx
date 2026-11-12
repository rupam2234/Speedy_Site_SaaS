"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  UserPlus,
} from "lucide-react";

interface QueueOrder {
  orderId: string;
  userId: string;
  customerEmail: string | null;
  websiteName: string | null;
  websiteAddress: string | null;
  orderDate: string | null;
  ageHours: number;
  urgency: "normal" | "warning" | "critical";
}

interface ExpertPoolMember {
  expertId: string;
  email: string | null;
  isAvailable: boolean;
  capacity: number;
  activeLoad: number;
}

export default function AdminQueue() {
  const [queue, setQueue] = useState<QueueOrder[]>([]);
  const [experts, setExperts] = useState<ExpertPoolMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchAssigning, setBatchAssigning] = useState(false);
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true);
  const [autoAssignLoading, setAutoAssignLoading] = useState(true);

  // Quick Assign Modal state
  const [assignFor, setAssignFor] = useState<QueueOrder | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, expertsRes, settingRes] = await Promise.all([
        fetch("/api/admin/queue"),
        fetch("/api/admin/experts"),
        fetch("/api/admin/settings/auto-assignment"),
      ]);

      const queueJson = await queueRes.json();
      const expertsJson = await expertsRes.json();

      if (!queueRes.ok) throw new Error(queueJson.message);
      if (!expertsRes.ok) throw new Error(expertsJson.message);

      setQueue(queueJson.queue ?? []);
      setExperts(expertsJson.experts ?? []);

      if (settingRes.ok) {
        const settingJson = await settingRes.json();
        setAutoAssignEnabled(Boolean(settingJson.enabled));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load queue");
    } finally {
      setLoading(false);
      setAutoAssignLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleAutoAssign = async () => {
    const nextVal = !autoAssignEnabled;
    setAutoAssignEnabled(nextVal);
    try {
      const res = await fetch("/api/admin/settings/auto-assignment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextVal }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(nextVal ? "Auto-assignment enabled" : "Auto-assignment paused");
    } catch (err: any) {
      setAutoAssignEnabled(!nextVal);
      toast.error(err.message || "Failed to update auto-assignment setting");
    }
  };

  const handleAssignSingle = async (orderId: string, expertId?: string) => {
    try {
      const endpoint = expertId ? "/api/admin/assignments" : "/api/admin/orders/assign";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expertId ? { orderId, expertId } : { orderId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success("Order dispatched successfully");
      setAssignFor(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBatchAutoAssign = async () => {
    setBatchAssigning(true);
    try {
      const res = await fetch("/api/admin/queue", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(json.message);
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBatchAssigning(false);
    }
  };

  const availableExperts = experts.filter((e) => e.isAvailable);
  const criticalCount = queue.filter((q) => q.urgency === "critical").length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unassigned Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Orders waiting for round-robin dispatch or manual developer assignment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-Assignment Toggle */}
          <div className="flex items-center gap-2.5 bg-card border rounded-lg px-3.5 py-2 shadow-sm">
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold leading-tight">Auto-Assignment</span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {autoAssignLoading ? "Loading..." : autoAssignEnabled ? "Active" : "Paused"}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoAssignEnabled}
              disabled={autoAssignLoading}
              onClick={handleToggleAutoAssign}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoAssignEnabled ? "bg-emerald-600" : "bg-muted-foreground/30"
              } ${autoAssignLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoAssignEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {queue.length > 0 && (
            <button
              onClick={handleBatchAutoAssign}
              disabled={batchAssigning || availableExperts.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {batchAssigning ? "Dispatching..." : "Auto-Assign All Eligible"}
            </button>
          )}
        </div>
      </div>

      {/* Critical SLA Warning Banner */}
      {criticalCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-200">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="text-sm font-medium">
            <strong>{criticalCount} order(s)</strong> have waited over 12 hours without developer assignment.
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className="border rounded-xl p-16 text-center space-y-3 bg-card shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-semibold">Queue is completely clear!</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            All managed WordPress orders currently have an assigned developer. Great job!
          </p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground font-semibold">
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Wait Duration</th>
                  <th className="px-4 py-3">Order Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {queue.map((order) => (
                  <tr key={order.orderId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{order.websiteName ?? "Unnamed Site"}</div>
                      <div className="text-xs text-muted-foreground">{order.websiteAddress}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-foreground">{order.customerEmail ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">{order.userId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          order.urgency === "critical"
                            ? "bg-red-500/15 text-red-600 dark:text-red-400"
                            : order.urgency === "warning"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {order.ageHours < 1 ? "< 1 hour" : `${Math.floor(order.ageHours)}h waiting`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {order.orderDate ? new Date(order.orderDate).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setAssignFor(order)}
                        className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90 inline-flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          QUICK ASSIGN DIALOG
          ───────────────────────────────────────────────────────── */}
      {assignFor && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setAssignFor(null)}
        >
          <div
            className="bg-background border rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Assign Order to Developer</h2>
            <p className="text-xs text-muted-foreground">
              {assignFor.websiteName ?? assignFor.websiteAddress}
            </p>

            <button
              onClick={() => handleAssignSingle(assignFor.orderId)}
              className="w-full border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-muted flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Auto Round-Robin Dispatch
            </button>

            <div className="space-y-1.5 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Or Pick Specific Developer:
              </p>
              {availableExperts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No available developers in pool.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {availableExperts.map((exp) => (
                    <button
                      key={exp.expertId}
                      onClick={() => handleAssignSingle(assignFor.orderId, exp.expertId)}
                      className="w-full border rounded-lg px-3 py-2 text-sm text-left hover:bg-muted flex items-center justify-between"
                    >
                      <span className="font-medium">{exp.email ?? exp.expertId}</span>
                      <span className="text-xs text-muted-foreground">
                        {exp.activeLoad} / {exp.capacity}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
