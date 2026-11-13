import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";

const worker = setupDB();

// GET /api/admin/orders?status=all|unassigned|in_progress|completed|pending&search=&page=&pageSize=&expertId=
export async function GET(req: NextRequest) {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("status") ?? "all";
    const expertId = searchParams.get("expertId");
    const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));

    const query = (worker as any)
      .from("orders")
      .select(
        "order_id, user_id, website_name, website_address, order_status, order_date, product_type, rum_connection, order_assignments(id, expert_id, status, is_active, assigned_at, accepted_at, completed_at, skip_reason)"
      )
      .eq("order_status", true)
      .order("order_date", { ascending: false });

    const { data: rawOrders, error } = await query;
    if (error) throw new Error(error.message);

    // Fetch user and expert profile emails
    const userIds = (rawOrders ?? []).map((r: any) => r.user_id).filter(Boolean);
    const expertIds = (rawOrders ?? []).flatMap((r: any) => (r.order_assignments ?? []).map((a: any) => a.expert_id)).filter(Boolean);
    const allProfileIds = Array.from(new Set([...userIds, ...expertIds]));

    const { data: profiles } = await (worker as any)
      .from("profiles")
      .select("id, email")
      .in("id", allProfileIds);

    const emailById: Record<string, string> = {};
    for (const p of profiles ?? []) {
      if (p.id) emailById[p.id] = p.email ?? "";
    }

    let orders = (rawOrders ?? []).map((row: any) => {
      const assignments = (row.order_assignments ?? []).sort(
        (a: any, b: any) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
      );
      const active = assignments.find((a: any) => a.is_active) ?? null;

      return {
        orderId: row.order_id,
        userId: row.user_id,
        customerEmail: emailById[row.user_id] || null,
        websiteName: row.website_name,
        websiteAddress: row.website_address,
        orderDate: row.order_date,
        productType: row.product_type,
        rumConnection: row.rum_connection,
        assignment: active
          ? {
              id: active.id,
              expertId: active.expert_id,
              expertEmail: emailById[active.expert_id] || null,
              status: active.status,
              assignedAt: active.assigned_at,
              acceptedAt: active.accepted_at,
              completedAt: active.completed_at,
            }
          : null,
        history: assignments.map((a: any) => ({
          id: a.id,
          expertId: a.expert_id,
          expertEmail: emailById[a.expert_id] || null,
          status: a.status,
          isActive: a.is_active,
          assignedAt: a.assigned_at,
          acceptedAt: a.accepted_at,
          completedAt: a.completed_at,
          skipReason: a.skip_reason,
        })),
      };
    });

    if (expertId) {
      orders = orders.filter((o: any) => o.assignment?.expertId === expertId);
    }

    if (filter === "unassigned") {
      orders = orders.filter((o: any) => o.assignment === null);
    } else if (filter === "in_progress") {
      orders = orders.filter((o: any) => ["accepted", "in_progress"].includes(o.assignment?.status));
    } else if (filter === "completed") {
      orders = orders.filter((o: any) => o.assignment?.status === "completed");
    } else if (filter === "pending") {
      orders = orders.filter((o: any) => o.assignment?.status === "pending");
    }

    if (search) {
      orders = orders.filter((o: any) => {
        const site = (o.websiteName || "").toLowerCase();
        const address = (o.websiteAddress || "").toLowerCase();
        const email = (o.customerEmail || "").toLowerCase();
        const expEmail = (o.assignment?.expertEmail || "").toLowerCase();
        const id = (o.orderId || "").toLowerCase();
        return (
          site.includes(search) ||
          address.includes(search) ||
          email.includes(search) ||
          expEmail.includes(search) ||
          id.includes(search)
        );
      });
    }

    const total = orders.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const paginatedOrders = orders.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json(
      {
        orders: paginatedOrders,
        total,
        page,
        pageSize,
        totalPages,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
