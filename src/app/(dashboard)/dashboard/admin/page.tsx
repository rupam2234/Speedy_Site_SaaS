"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  LifeBuoy,
  ListTodo,
  TrendingUp,
  UserCheck,
  UserCog,
  Wrench,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ManagementStats {
  metrics: {
    totalOrders: number;
    unassignedQueue: number;
    criticalSla: number;
    inProgress: number;
    pendingAccept: number;
    completed: number;
    totalExperts: number;
    availableExperts: number;
    totalCapacity: number;
    totalActiveLoad: number;
    openTickets: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    subtitle: string;
    time: string;
  }>;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<ManagementStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/stats");
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        setData(json);
      } catch (e: any) {
        toast.error(e.message || "Failed to load management stats");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = data?.metrics;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operations Mission Control</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Managed WordPress performance delivery & service operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/queue"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg shadow-sm hover:opacity-90 transition-opacity"
          >
            <ListTodo className="w-4 h-4" />
            Triage Queue
          </Link>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
          >
            <Wrench className="w-4 h-4" />
            All Orders
          </Link>
        </div>
      </div>

      {/* Critical SLA Warning Alert */}
      {metrics && metrics.criticalSla > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1 text-sm font-medium">
            <strong>{metrics.criticalSla} order(s)</strong> have waited in the unassigned queue for over 12 hours.
          </div>
          <Link
            href="/dashboard/queue"
            className="text-xs font-semibold underline underline-offset-2 hover:opacity-80"
          >
            View Queue &rarr;
          </Link>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Unassigned Queue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned Queue</CardTitle>
            <Inbox className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.unassignedQueue ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.criticalSla ? `${metrics.criticalSla} orders breaching SLA` : "All orders under SLA"}
            </p>
            <Link
              href="/dashboard/queue"
              className="mt-3 inline-flex items-center text-xs text-primary font-medium hover:underline"
            >
              Open Queue <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </CardContent>
        </Card>

        {/* Active Optimizations */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.inProgress ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{metrics?.completed ?? 0} successfully completed
            </p>
            <Link
              href="/dashboard/orders"
              className="mt-3 inline-flex items-center text-xs text-primary font-medium hover:underline"
            >
              Manage Orders <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </CardContent>
        </Card>

        {/* Developer Pool Utilization */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Developer Pool</CardTitle>
            <UserCog className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics?.totalActiveLoad ?? 0} / {metrics?.totalCapacity ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.availableExperts ?? 0} of {metrics?.totalExperts ?? 0} developers available
            </p>
            <Link
              href="/dashboard/experts"
              className="mt-3 inline-flex items-center text-xs text-primary font-medium hover:underline"
            >
              Manage Pool <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </CardContent>
        </Card>

        {/* Open Support Tickets */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Support Tickets</CardTitle>
            <LifeBuoy className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.openTickets ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Customer inquiries awaiting triage</p>
            <Link
              href="/dashboard/tickets"
              className="mt-3 inline-flex items-center text-xs text-primary font-medium hover:underline"
            >
              Support Inbox <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Operations Overview & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Dispatch & System Overview */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Service Operations</CardTitle>
            <CardDescription>Core workflows for service management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/dashboard/orders"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Managed WP Orders</div>
                  <div className="text-xs text-muted-foreground">{metrics?.totalOrders ?? 0} total sites tracked</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>

            <Link
              href="/dashboard/queue"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-amber-500/10 text-amber-600">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Unassigned Orders</div>
                  <div className="text-xs text-muted-foreground">{metrics?.unassignedQueue ?? 0} awaiting dispatch</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>

            <Link
              href="/dashboard/experts"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Developer Capacity</div>
                  <div className="text-xs text-muted-foreground">{metrics?.availableExperts ?? 0} online for auto-assign</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>

            <Link
              href="/dashboard/tickets"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-purple-500/10 text-purple-600">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Customer Support</div>
                  <div className="text-xs text-muted-foreground">{metrics?.openTickets ?? 0} active tickets</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Live Operational Activity Log */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Live Operational Feed</CardTitle>
            <CardDescription>Recent service orders, assignments, and completions</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.recentActivity || data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No recent activity recorded.</p>
            ) : (
              <div className="space-y-4">
                {data.recentActivity.map((activity) => (
                  <div
                    key={activity.id + activity.type}
                    className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                        {activity.type === "completed" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : activity.type === "assigned" ? (
                          <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{activity.title}</div>
                        <div className="text-xs text-muted-foreground">{activity.subtitle}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activity.time ? new Date(activity.time).toLocaleDateString() : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
