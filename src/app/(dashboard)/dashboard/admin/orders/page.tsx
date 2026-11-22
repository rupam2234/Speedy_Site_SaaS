"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SkipForward,
  UserPlus,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { OrderChatPanel } from "@/components/chat";
import type { ChannelType } from "@/lib/chat/types";

interface AssignmentHistory {
  id: string;
  expertId: string;
  expertEmail: string | null;
  status: string;
  isActive: boolean;
  assignedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  skipReason: string | null;
}

interface Order {
  orderId: string;
  userId: string;
  customerEmail: string | null;
  websiteName: string | null;
  websiteAddress: string | null;
  orderDate: string | null;
  productType: string | null;
  rumConnection: boolean | null;
  assignment: {
    id: string;
    expertId: string;
    expertEmail: string | null;
    status: string;
    assignedAt: string;
    acceptedAt: string | null;
    completedAt: string | null;
  } | null;
  history: AssignmentHistory[];
}

interface Expert {
  expertId: string;
  email: string | null;
  isAvailable: boolean;
  capacity: number;
  activeLoad: number;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Selected Order for Detail Drawer
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [adminChatTab, setAdminChatTab] = useState<ChannelType>("internal");

  // Modals
  const [pickFor, setPickFor] = useState<Order | null>(null);
  const [reasonFor, setReasonFor] = useState<Order | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        status: filter,
        page: page.toString(),
        pageSize: "15",
      });
      if (search.trim()) queryParams.set("search", search.trim());

      const [ordersRes, expertsRes] = await Promise.all([
        fetch(`/api/admin/orders?${queryParams.toString()}`),
        fetch("/api/admin/experts"),
      ]);

      const ordersJson = await ordersRes.json();
      const expertsJson = await expertsRes.json();

      if (!ordersRes.ok) throw new Error(ordersJson.message);
      if (!expertsRes.ok) throw new Error(expertsJson.message);

      setOrders(ordersJson.orders ?? []);
      setTotalPages(ordersJson.totalPages ?? 1);
      setTotal(ordersJson.total ?? 0);
      setExperts(expertsJson.experts ?? []);

      // Refresh drawer if open
      setSelectedOrder((prev) => {
        if (!prev) return null;
        return (ordersJson.orders ?? []).find((o: Order) => o.orderId === prev.orderId) ?? prev;
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async (orderId: string, expertId?: string) => {
    try {
      const res = await fetch("/api/admin/orders/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expertId ? { orderId, expertId } : { orderId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success("Order assigned successfully");
      setPickFor(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const reassign = async (orderId: string, expertId: string) => {
    try {
      const res = await fetch("/api/admin/orders/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, expertId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success("Order reassigned successfully");
      setPickFor(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const skip = async (orderId: string) => {
    try {
      const res = await fetch("/api/admin/orders/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, skipReason: reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success("Assignment skipped");
      setReasonFor(null);
      setReason("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleStatusUpdate = async (assignmentId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/orders/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(`Status updated to ${status}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const availableExperts = experts.filter((e) => e.isAvailable);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Managed WordPress Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track site optimization orders, assignments, and service delivery status.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 border rounded-lg p-1 bg-muted/40">
          {[
            { id: "all", label: "All" },
            { id: "unassigned", label: "Unassigned" },
            { id: "pending", label: "Pending" },
            { id: "in_progress", label: "In Progress" },
            { id: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by domain, customer email, or order ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{orders.length}</strong> of <strong>{total}</strong> orders
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="border rounded-xl p-12 text-center text-sm text-muted-foreground">
          No orders match your filter criteria.
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground font-semibold">
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Assigned Developer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Order Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => {
                  const status = order.assignment ? order.assignment.status : "unassigned";
                  return (
                    <tr
                      key={order.orderId}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{order.websiteName ?? "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground">{order.websiteAddress}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-foreground">{order.customerEmail ?? "-"}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">{order.userId}</div>
                      </td>
                      <td className="px-4 py-3">
                        {order.assignment?.expertEmail ? (
                          <div className="font-medium text-xs">{order.assignment.expertEmail}</div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : status === "in_progress" || status === "accepted"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : status === "pending"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="border rounded-md px-2.5 py-1 text-xs font-medium hover:bg-muted"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => setPickFor(order)}
                            className="bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs font-medium hover:opacity-90"
                          >
                            {order.assignment ? "Reassign" : "Assign"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="border rounded px-2.5 py-1 text-xs font-medium disabled:opacity-40 hover:bg-muted inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="border rounded px-2.5 py-1 text-xs font-medium disabled:opacity-40 hover:bg-muted inline-flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          ORDER DETAIL DRAWER (Sheet)
          ───────────────────────────────────────────────────────── */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-6 space-y-6">
          {selectedOrder && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <span className="capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {selectedOrder.assignment ? selectedOrder.assignment.status.replace("_", " ") : "Unassigned"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedOrder.orderDate ? new Date(selectedOrder.orderDate).toLocaleDateString() : ""}
                  </span>
                </div>
                <SheetTitle className="text-xl font-bold mt-2">
                  {selectedOrder.websiteName ?? "Website Optimization"}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  <a
                    href={selectedOrder.websiteAddress ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {selectedOrder.websiteAddress} <ExternalLink className="w-3 h-3" />
                  </a>
                </SheetDescription>
              </SheetHeader>

              {/* Customer Info Card */}
              <div className="border rounded-xl p-4 bg-muted/20 space-y-2">
                <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Customer & Order Details
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <div className="font-medium text-foreground">{selectedOrder.customerEmail ?? "Not available"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Service Type:</span>
                    <div className="font-medium text-foreground capitalize">{selectedOrder.productType ?? "Managed WP"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Order ID:</span>
                    <div className="font-mono text-[11px] text-foreground truncate">{selectedOrder.orderId}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Customer ID:</span>
                    <div className="font-mono text-[11px] text-foreground truncate">{selectedOrder.userId}</div>
                  </div>
                </div>
              </div>

              {/* Live Evidence Engine Deep-Link */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-primary">Real User Data & Diagnostics</div>
                  <div className="text-xs text-muted-foreground">Inspect live Core Web Vitals and frontend evidence</div>
                </div>
                <a
                  href={`/dashboard/rum/web-vitals?site=${encodeURIComponent(selectedOrder.websiteName || "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 inline-flex items-center gap-1.5"
                >
                  Open RUM <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Assignment Controls */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Dispatch Actions
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setPickFor(selectedOrder)}
                    className="flex-1 border rounded-lg px-3 py-2 text-xs font-medium hover:bg-muted inline-flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {selectedOrder.assignment ? "Reassign Developer" : "Assign Developer"}
                  </button>

                  {selectedOrder.assignment && (
                    <button
                      onClick={() => setReasonFor(selectedOrder)}
                      className="border rounded-lg px-3 py-2 text-xs font-medium hover:bg-muted text-amber-600 dark:text-amber-400 inline-flex items-center justify-center gap-1.5"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Skip Assignment
                    </button>
                  )}

                  {selectedOrder.assignment && selectedOrder.assignment.status !== "completed" && (
                    <button
                      onClick={() => handleStatusUpdate(selectedOrder.assignment!.id, "completed")}
                      className="border rounded-lg px-3 py-2 text-xs font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 inline-flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>

              {/* Order Communication Channels */}
              <div className="space-y-3 pt-2 border-t">
                <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Communication Channels
                </div>

                <div className="flex rounded-lg border p-1 bg-muted/40 gap-1">
                  <button
                    onClick={() => setAdminChatTab("internal")}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                      adminChatTab === "internal"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Expert Backchannel (Active)</span>
                  </button>
                  <button
                    onClick={() => setAdminChatTab("client")}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                      adminChatTab === "client"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Customer Chat (Read-Only)</span>
                  </button>
                </div>

                <OrderChatPanel
                  key={`${selectedOrder.orderId}-${adminChatTab}`}
                  orderId={selectedOrder.orderId}
                  channelType={adminChatTab}
                  isReadOnlyOverride={adminChatTab === "client"}
                  title={
                    adminChatTab === "client"
                      ? "Customer Dialogue Stream"
                      : "Staff Backchannel"
                  }
                  subtitle={
                    adminChatTab === "client"
                      ? "Read-only inspection; intervention disabled"
                      : "Direct coordination with the assigned expert"
                  }
                />
              </div>

              {/* Assignment Audit Trail Timeline */}
              <div className="space-y-3 pt-2 border-t">
                <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Assignment Audit Trail ({selectedOrder.history?.length ?? 0})
                </div>

                {!selectedOrder.history || selectedOrder.history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No assignment history yet.</p>
                ) : (
                  <div className="space-y-3 relative pl-4 border-l">
                    {selectedOrder.history.map((item) => (
                      <div key={item.id} className="relative text-xs space-y-1">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {item.expertEmail ?? item.expertId}
                          </span>
                          <span className="capitalize px-1.5 py-0.5 rounded text-[10px] bg-muted font-medium">
                            {item.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Assigned: {new Date(item.assignedAt).toLocaleString()}
                        </div>
                        {item.skipReason && (
                          <div className="p-2 rounded bg-amber-500/10 text-amber-900 dark:text-amber-200 text-[11px]">
                            <strong>Skip reason:</strong> {item.skipReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ─────────────────────────────────────────────────────────
          ASSIGN / REASSIGN MODAL
          ───────────────────────────────────────────────────────── */}
      {pickFor && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPickFor(null)}
        >
          <div
            className="bg-background border rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">
              {pickFor.assignment ? "Reassign" : "Assign"} Developer
            </h2>
            <p className="text-xs text-muted-foreground">
              {pickFor.websiteName ?? pickFor.websiteAddress}
            </p>

            <button
              onClick={() => assign(pickFor.orderId)}
              className="w-full border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-muted flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Auto Round-Robin Dispatch
            </button>

            <div className="space-y-1.5 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Or Assign Manually to Developer:
              </p>
              {availableExperts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No available developers in pool.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {availableExperts.map((exp) => (
                    <button
                      key={exp.expertId}
                      onClick={() =>
                        pickFor.assignment
                          ? reassign(pickFor.orderId, exp.expertId)
                          : assign(pickFor.orderId, exp.expertId)
                      }
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

      {/* ─────────────────────────────────────────────────────────
          SKIP MODAL
          ───────────────────────────────────────────────────────── */}
      {reasonFor && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setReasonFor(null)}
        >
          <div
            className="bg-background border rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Skip Assignment</h2>
            <p className="text-xs text-muted-foreground">
              {reasonFor.websiteName ?? reasonFor.websiteAddress}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State reason for skipping (e.g. Developer on leave, specialized WooCommerce stack needed)..."
              rows={3}
              className="border rounded-lg px-3 py-2 text-sm w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setReasonFor(null)}
                className="border rounded-lg px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => skip(reasonFor.orderId)}
                disabled={reason.trim().length < 3}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
