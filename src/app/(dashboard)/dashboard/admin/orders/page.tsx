"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Assignment {
  id: string;
  expertId: string;
  expertEmail: string | null;
  status: string;
  assignedAt: string;
}

interface Order {
  orderId: string;
  websiteName: string | null;
  websiteAddress: string | null;
  orderDate: string | null;
  assignment: Assignment | null;
}

interface Expert {
  expertId: string;
  email: string | null;
  isAvailable: boolean;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [filter, setFilter] = useState<"all" | "unassigned">("all");
  const [loading, setLoading] = useState(true);
  const [pickFor, setPickFor] = useState<Order | null>(null);
  const [reasonFor, setReasonFor] = useState<Order | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, expertsRes] = await Promise.all([fetch(`/api/admin/orders?status=${filter}`), fetch("/api/admin/experts")]);
      const ordersJson = await ordersRes.json();
      const expertsJson = await expertsRes.json();
      if (!ordersRes.ok) throw new Error(ordersJson.message);
      if (!expertsRes.ok) throw new Error(expertsJson.message);
      setOrders(ordersJson.orders ?? []);
      setExperts(expertsJson.experts ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

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
      toast.success("Order assigned");
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
      toast.success("Order reassigned");
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

  const availableExperts = experts.filter((e) => e.isAvailable);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Managed WP Orders</h1>
          <p className="text-sm text-muted-foreground">All orders with their assignment status.</p>
        </div>
        <div className="flex gap-2">
          {(["all", "unassigned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1.5 text-sm capitalize ${filter === f ? "bg-primary text-primary-foreground" : "border"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders match this filter.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Expert</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{order.websiteName ?? "Unnamed site"}</div>
                    <div className="text-xs text-muted-foreground">{order.websiteAddress}</div>
                  </td>
                  <td className="px-4 py-3">{order.assignment?.expertEmail ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                  <td className="px-4 py-3">{order.assignment?.status ?? "-"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {order.assignment ? new Date(order.assignment.assignedAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setPickFor(order)} className="border rounded px-3 py-1 text-xs hover:bg-muted">
                        {order.assignment ? "Reassign" : "Assign"}
                      </button>
                      {order.assignment && (
                        <button onClick={() => setReasonFor(order)} className="border rounded px-3 py-1 text-xs hover:bg-muted">
                          Skip
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
{pickFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setPickFor(null)}>
          <div className="bg-background border rounded-lg p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">{pickFor.assignment ? "Reassign" : "Assign"} order</h2>
            <p className="text-sm text-muted-foreground">{pickFor.websiteName ?? pickFor.websiteAddress}</p>
            <button onClick={() => assign(pickFor.orderId)} className="w-full border rounded px-4 py-2 text-sm hover:bg-muted">
              Auto round-robin
            </button>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Or pick an expert:</p>
              {availableExperts.length === 0 && <p className="text-xs text-muted-foreground">No available experts.</p>}
              {availableExperts.map((expert) => (
                <button
                  key={expert.expertId}
                  onClick={() => (pickFor.assignment ? reassign(pickFor.orderId, expert.expertId) : assign(pickFor.orderId, expert.expertId))}
                  className="w-full border rounded px-4 py-2 text-sm text-left hover:bg-muted"
                >
                  {expert.email ?? expert.expertId}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {reasonFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setReasonFor(null)}>
          <div className="bg-background border rounded-lg p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Skip assignment</h2>
            <p className="text-sm text-muted-foreground">{reasonFor.websiteName ?? reasonFor.websiteAddress}</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (required)"
              rows={3}
              className="border rounded px-3 py-2 text-sm w-full bg-transparent"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setReasonFor(null)} className="border rounded px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={() => skip(reasonFor.orderId)}
                disabled={reason.trim().length < 3}
                className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
