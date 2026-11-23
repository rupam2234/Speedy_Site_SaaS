"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, MessageSquare, Shield, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { OrderChatPanel } from "@/components/chat";
import type { ChannelType } from "@/lib/chat/types";

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

// Expert order triage view with dual-channel communications center.
export default function ExpertOrders() {
  const [orders, setOrders] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOrder, setChatOrder] = useState<Assignment | null>(null);
  const [activeChannel, setActiveChannel] = useState<ChannelType>("client");

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
                <th className="px-4 py-3 font-medium">Communications</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.assignmentId} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{order.websiteName ?? "Unnamed site"}</div>
                    {order.websiteAddress ? (
                      <a
                        href={order.websiteAddress}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {order.websiteAddress}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
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
                    <button
                      onClick={() => setChatOrder(order)}
                      className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      <span>Open Chat</span>
                    </button>
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

      {/* Communications Center Drawer */}
      <Sheet open={!!chatOrder} onOpenChange={(open) => !open && setChatOrder(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-6 space-y-4">
          {chatOrder && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <span className="capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {chatOrder.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Order ID: {chatOrder.orderId.slice(0, 8)}...
                  </span>
                </div>
                <SheetTitle className="text-lg font-bold mt-2">
                  {chatOrder.websiteName ?? "Website Optimization"}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {chatOrder.websiteAddress}
                </SheetDescription>
              </SheetHeader>

              {/* Real User Data Deep-Link */}
              {chatOrder.websiteName && (
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-primary">Real User Data & Diagnostics</div>
                    <div className="text-[11px] text-muted-foreground">Inspect Core Web Vitals and frontend evidence</div>
                  </div>
                  <a
                    href={`/dashboard/rum/web-vitals?site=${encodeURIComponent(chatOrder.websiteName)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 inline-flex items-center gap-1"
                  >
                    Open RUM <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Dual Channel Switcher */}
              <div className="flex rounded-lg border p-1 bg-muted/40 gap-1">
                <button
                  onClick={() => setActiveChannel("client")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                    activeChannel === "client"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Customer Chat</span>
                </button>
                <button
                  onClick={() => setActiveChannel("internal")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                    activeChannel === "internal"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Admin Backchannel</span>
                </button>
              </div>

              {/* Chat View */}
              <OrderChatPanel
                key={`${chatOrder.orderId}-${activeChannel}`}
                orderId={chatOrder.orderId}
                channelType={activeChannel}
                title={
                  activeChannel === "client"
                    ? "Customer Communication"
                    : "Admin Direct Backchannel"
                }
                subtitle={
                  activeChannel === "client"
                    ? "Direct client discussion for this order"
                    : "Private internal instructions and questions with administrators"
                }
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
