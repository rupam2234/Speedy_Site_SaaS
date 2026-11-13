import { setupDB } from "@/lib/db";
import { emailExpertAssignment } from "@/app/api/emails/expertAssignment";

const worker = setupDB();

export interface SystemSettingAutoAssignment {
  enabled: boolean;
  updatedAt: string;
  updatedBy?: string | null;
}

export interface ManualAssignmentParams {
  orderId?: string;
  onboardingId?: string;
  expertId?: string;
  adminUserId?: string;
  notes?: string;
}

export interface ResolveOrderParams {
  orderId?: string;
  onboardingId?: string;
  userId?: string;
  websiteName?: string;
  siteName?: string;
}

/**
 * Reads the auto-assignment setting from public.system_settings.
 * Defaults to true if not configured.
 */
export async function getAutoAssignmentSetting(): Promise<SystemSettingAutoAssignment> {
  try {
    const { data, error } = await (worker as any)
      .from("system_settings")
      .select("value, updated_at, updated_by")
      .eq("key", "auto_assignment_enabled")
      .maybeSingle();

    if (error) {
      console.warn("Failed to fetch system_settings for auto_assignment_enabled:", error.message);
      return { enabled: true, updatedAt: new Date().toISOString() };
    }

    if (!data) {
      return { enabled: true, updatedAt: new Date().toISOString() };
    }

    const val = typeof data.value === "object" ? data.value : JSON.parse(data.value || "{}");
    return {
      enabled: val?.enabled ?? true,
      updatedAt: data.updated_at ?? new Date().toISOString(),
      updatedBy: data.updated_by ?? null,
    };
  } catch (err: any) {
    console.error("Error in getAutoAssignmentSetting:", err);
    return { enabled: true, updatedAt: new Date().toISOString() };
  }
}

/**
 * Updates the auto-assignment setting in public.system_settings.
 */
export async function setAutoAssignmentSetting(
  enabled: boolean,
  adminUserId?: string
): Promise<SystemSettingAutoAssignment> {
  const now = new Date().toISOString();
  const payload: any = {
    key: "auto_assignment_enabled",
    value: { enabled },
    updated_at: now,
  };
  if (adminUserId) {
    payload.updated_by = adminUserId;
  }

  const { data, error } = await (worker as any)
    .from("system_settings")
    .upsert(payload, { onConflict: "key" })
    .select("value, updated_at, updated_by")
    .single();

  if (error) {
    throw new Error(`Failed to update auto_assignment setting: ${error.message}`);
  }

  const val = typeof data.value === "object" ? data.value : JSON.parse(data.value || "{}");
  return {
    enabled: val?.enabled ?? enabled,
    updatedAt: data.updated_at ?? now,
    updatedBy: data.updated_by ?? adminUserId ?? null,
  };
}

/**
 * Resolves an order from orders table supporting both modern and legacy parameter conventions.
 */
export async function resolveOrder(params: ResolveOrderParams) {
  const targetId = params.orderId || params.onboardingId;

  if (targetId) {
    const { data, error } = await worker
      .from("orders")
      .select("*")
      .eq("order_id", targetId)
      .maybeSingle();

    if (!error && data) return data;
  }

  const site = params.websiteName || params.siteName;
  if (params.userId && site) {
    const { data, error } = await worker
      .from("orders")
      .select("*")
      .eq("user_id", params.userId)
      .eq("website_name", site)
      .maybeSingle();

    if (!error && data) return data;
  }

  return null;
}

/**
 * Unified notification dispatcher for expert assignments.
 * Updates in-app notifications and sends Resend email to the expert.
 */
export async function dispatchAssignmentNotification(orderId: string, expertId: string) {
  try {
    // 1. Fetch order details
    const { data: order, error: orderErr } = await worker
      .from("orders")
      .select("order_id, user_id, website_name, website_address, order_date")
      .eq("order_id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      console.warn("dispatchAssignment: Order not found for id", orderId);
    }

    const siteDomain = order?.website_name || order?.website_address || "Website";

    // 2. Fetch customer details
    let customerEmail: string | undefined;
    if (order?.user_id) {
      const { data: customerProfile } = await (worker as any)
        .from("profiles")
        .select("email")
        .eq("id", order.user_id)
        .maybeSingle();
      customerEmail = customerProfile?.email;
    }

    // 3. Fetch expert profile
    const { data: expertProfile } = await (worker as any)
      .from("profiles")
      .select("id, email")
      .eq("id", expertId)
      .maybeSingle();

    // 4. Create in-app notification for expert
    await (worker as any).from("notifications").insert({
      user_id: expertId,
      type: "assignment",
      message: `You have been assigned to optimize ${siteDomain}. 24h SLA window started.`,
      link: "/dashboard/orders",
      read: false,
    });

    // 5. Send email notification via Resend
    if (expertProfile?.email) {
      await emailExpertAssignment({
        expertEmail: expertProfile.email,
        siteDomain,
        customerEmail,
        customerId: order?.user_id,
        orderId,
        slaHours: 24,
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("dispatchAssignment notification failed:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Automated round-robin assignment engine.
 * Uses pick_next_expert() PostgreSQL function for concurrency-safe SKIP LOCKED selection.
 */
export async function assignOrderAutomatically(orderId: string, assignedBy?: string | null) {
  // Check if order already has an active assignment
  const { data: existing, error: existingErr } = await (worker as any)
    .from("order_assignments")
    .select("id, expert_id, status")
    .eq("order_id", orderId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingErr) throw new Error(existingErr.message);
  if (existing) {
    return { success: false, reason: "Order already has an active assignment", assignment: existing };
  }

  // Invoke atomic pick_next_expert()
  const { data: picked, error: pickErr } = await (worker as any).rpc("pick_next_expert");
  if (pickErr) throw new Error(pickErr.message);

  if (!picked) {
    // No eligible expert free (all at capacity or none available) -> leave in queue
    return {
      success: false,
      reason: "No eligible expert available in pool (retained in unassigned queue)",
    };
  }

  const assignedExpertId = picked as string;

  const { data: assignment, error: insertErr } = await (worker as any)
    .from("order_assignments")
    .insert({
      order_id: orderId,
      expert_id: assignedExpertId,
      assigned_by: assignedBy ?? null,
      status: "pending",
      is_active: true,
    })
    .select()
    .single();

  if (insertErr) throw new Error(insertErr.message);

  // Dispatch notifications asynchronously
  await dispatchAssignmentNotification(orderId, assignedExpertId);

  return { success: true, assignment, expertId: assignedExpertId };
}

/**
 * Checks the global auto-assignment toggle and dispatches an order if enabled.
 * Intended to run inside a decoupled background task (e.g. Next.js after()).
 */
export async function runAutoAssignmentIfEnabled(orderId: string) {
  const settings = await getAutoAssignmentSetting();
  if (!settings.enabled) {
    return {
      success: false,
      skipped: true,
      reason: "Auto-assignment is disabled",
    };
  }

  return assignOrderAutomatically(orderId);
}

/**
 * Manual assignment engine for admin triage.
 */
export async function assignOrderManually(params: ManualAssignmentParams) {
  const targetOrderId = params.orderId || params.onboardingId;
  const targetExpertId = params.expertId;

  if (!targetOrderId) throw new Error("Order ID is required");
  if (!targetExpertId) throw new Error("Expert ID is required");

  // Validate order existence
  const { data: order, error: orderErr } = await worker
    .from("orders")
    .select("order_id")
    .eq("order_id", targetOrderId)
    .maybeSingle();

  if (orderErr) throw new Error(orderErr.message);
  if (!order) throw new Error("Order not found");

  // Validate expert eligibility in pool
  const { data: poolMember, error: poolErr } = await (worker as any)
    .from("experts_pool")
    .select("expert_id, is_available, capacity")
    .eq("expert_id", targetExpertId)
    .maybeSingle();

  if (poolErr) throw new Error(poolErr.message);
  if (!poolMember) throw new Error("Expert not found in experts pool");
  if (!poolMember.is_available) throw new Error("Expert is marked as unavailable");

  // Check existing active assignment
  const { data: current, error: currentErr } = await (worker as any)
    .from("order_assignments")
    .select("id, expert_id")
    .eq("order_id", targetOrderId)
    .eq("is_active", true)
    .maybeSingle();

  if (currentErr) throw new Error(currentErr.message);

  if (current) {
    if (current.expert_id === targetExpertId) {
      return { success: false, reason: "Order is already assigned to this expert", assignment: current };
    }

    // Reassigning: deactivate existing
    const { error: deactivateErr } = await (worker as any)
      .from("order_assignments")
      .update({
        is_active: false,
        status: "reassigned",
        skip_reason: params.notes ?? "Manually reassigned by admin",
      })
      .eq("id", current.id);

    if (deactivateErr) throw new Error(deactivateErr.message);
  }

  // Insert new active assignment
  const { data: assignment, error: insertErr } = await (worker as any)
    .from("order_assignments")
    .insert({
      order_id: targetOrderId,
      expert_id: targetExpertId,
      assigned_by: params.adminUserId ?? null,
      status: "pending",
      is_active: true,
    })
    .select()
    .single();

  if (insertErr) throw new Error(insertErr.message);

  // Update expert's last_assigned_at
  await (worker as any)
    .from("experts_pool")
    .update({ last_assigned_at: new Date().toISOString() })
    .eq("expert_id", targetExpertId);

  // Dispatch unified notifications
  await dispatchAssignmentNotification(targetOrderId, targetExpertId);

  return { success: true, assignment };
}
