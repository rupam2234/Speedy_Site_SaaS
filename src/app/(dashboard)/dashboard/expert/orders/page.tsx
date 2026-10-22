"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Assignment {
  assignmentId: string;
  orderId: string;
  websiteName: string | null;
  websiteAddress: string | null;
  orderDate: string | null;
  status: string;
  assignedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
}

const EXPERT_ACTIONS: Record<string, string[]> = {
  pending: ["accepted"],
  accepted: ["in_progress", "completed"],
  in_progress: ["completed"],
  completed: [],
};

export default function ExpertOrders() {
  const [orders, setOrders] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expert/orders");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setOrders(json.orders ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (assignmentId: string, status: string) => {
    try {
      const res = await fetch("/api/expert/orders/status", {
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Orders</h1>
        <p className="text-sm text-muted-foreground">Orders assigned to you. Update status as you work.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders assigned to you yet.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
                <th className="px-4 py-3 font-medium">Accepted</th>
                <th className="px-4 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.assignmentId} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{order.websiteName ?? "Unnamed site"}</div>
                    <div className="text-xs text-muted-foreground">{order.websiteAddress}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        order.status === "pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                        order.status === "accepted" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                        order.status === "in_progress" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" :
                        order.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(order.assignedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {order.acceptedAt ? new Date(order.acceptedAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {order.completedAt ? new Date(order.completedAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {EXPERT_ACTIONS[order.status]?.map((next) => (
                        <button
                          key={next}
                          onClick={() => updateStatus(order.assignmentId, next)}
                          className="border rounded px-3 py-1 text-xs hover:bg-muted"
                        >
                          {next.charAt(0).toUpperCase() + next.slice(1).replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}