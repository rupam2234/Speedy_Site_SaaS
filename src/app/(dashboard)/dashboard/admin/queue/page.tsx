"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface QueueOrder {
  orderId: string;
  userId: string;
  websiteName: string | null;
  websiteAddress: string | null;
  orderDate: string | null;
}

export default function AdminQueue() {
  const [queue, setQueue] = useState<QueueOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/queue");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setQueue(json.queue ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Unassigned Queue</h1>
        <p className="text-sm text-muted-foreground">Orders waiting for an expert assignment.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading queue...</p>
      ) : queue.length === 0 ? (
        <p className="text-sm text-muted-foreground">All orders are assigned. Great job!</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Order Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((order) => (
                <tr key={order.orderId} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{order.websiteName ?? "Unnamed site"}</div>
                    <div className="text-xs text-muted-foreground">{order.websiteAddress}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{order.userId}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {order.orderDate ? new Date(order.orderDate).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/dashboard/admin/orders?status=unassigned`}
                      className="border rounded px-3 py-1 text-xs hover:bg-muted"
                    >
                      Assign
                    </a>
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