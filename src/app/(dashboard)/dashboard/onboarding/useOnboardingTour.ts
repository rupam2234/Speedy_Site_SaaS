"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderData } from "@/app/api";
import { useAddSite } from "@/components/theme/addSite";
import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";
import { useSiteContext } from "../siteContext";
import { STEPS } from "./steps";

export type PluginStatus = {
  loading: boolean;
  installed: boolean;
  keyed: boolean;
};

/**
 * The single state driving the verify button and the success indicator on
 * the plugin step: "verifying" while the request is in flight, "verified"
 * once the server recorded the verification, "idle" otherwise (including
 * right after a failed attempt, so the button never gets stuck).
 */
export type VerifyStatus = "idle" | "verifying" | "verified";

export type OnboardingTour = {
  order: OrderData | null;
  isLoading: boolean;
  isStepDone: (index: number) => boolean;
  /** True once every recorded step of the tour is done. */
  isTourComplete: boolean;
  /** True once the steps were verified against the DB on this page load. */
  stepsVerified: boolean;
  /** True once the panel has been positioned for the active site. */
  isPositioned: boolean;
  plugin: PluginStatus;
  /** One state for the whole verify button: idle -> verifying -> verified/idle. */
  verifyStatus: VerifyStatus;
  busy: string | null;
  error: string | null;
  /**
   * True when this site can be configured without a new payment. There is no
   * free tier and each managed_wp entitlement covers one site, so a brand-new
   * site needs an unused entitlement -- which is why unconnected sites start
   * with payment. null = not resolved yet.
   */
  hasServiceForSite: boolean | null;
  /** True when an active managed_wp entitlement exists AND is linked to an order (payment completed). */
  hasPaidForSite: boolean | null;
  /** True while a missed-webhook reconcile is in flight. */
  isReconciling: boolean;
  /**
   * The step the content panel is showing. The panel never moves on its own:
   * it changes when the user presses Next or picks a step from the progress bar.
   */
  currentStep: number;
  /** Moves the panel to the next step. */
  goNext: () => void;
  /** Moves the panel to a given step. */
  goToStep: (index: number) => void;
  // "add your site" step
  siteInput: string;
  setSiteInput: (value: string) => void;
  /** WordPress login URL collected alongside the domain. */
  wpLoginUrl: string;
  setWpLoginUrl: (value: string) => void;
  /** Set when an existing order is found for this domain. */
  existingSite: { order_id: string; website_name: string } | null;
  addingSite: boolean;
  addSiteError: string | null;
  addSiteSuccess: string | null;
  createSite: () => Promise<void>;
  // later steps
  /** Binds the HMAC silently and runs the given plugin zip downloader. */
  downloadPlugin: (
    download: (domain: string) => Promise<void>,
  ) => Promise<void>;
  /**
   * Checks the plugin connection and, when the site answers, verifies the
   * installation: binds the signature, confirms it and records the step.
   */
  verifyInstallation: () => Promise<void>;
  startPayment: () => Promise<void>;
};

/**
 * Every piece of state and every side effect of the setup tour.
 *
 * Site + progress live on the `orders` rows (read through SiteContext, written
 * back through /api/orders/setup-step), so there is exactly one table behind
 * this flow and no onboarding state to keep in sync.
 */
export function useOnboardingTour(
  site: string,
  siteFromUrl: string | null,
  sessionId?: string | null,
  requestedStep?: number | null,
): OnboardingTour {
  const router = useRouter();
  const {
    selectedSite,
    setSelectedSite,
    orders,
    setOrders,
    fetchOrders,
    setPlan,
    setPlanExpiresAt,
  } = useSiteContext();
  const user = useSupabaseUser();
  const addSite = useAddSite();

  const [signature, setSignature] = useState<string | null>(null);
  const [plugin, setPlugin] = useState<PluginStatus>({
    loading: false,
    installed: false,
    keyed: false,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  /**
   * The step the content panel is showing. The flow is explicit: the panel
   * only moves when the user presses Next or picks a step from the progress
   * bar, never because a step completed in the background. STEPS.length means
   * the panel has advanced past the last tour step onto the payment card.
   */
  const [currentStep, setCurrentStep] = useState(0);
  /**
   * The site the panel was initially positioned for. Guards the one-time
   * positioning so later step completions never move the panel.
   */
  const [positionedForSite, setPositionedForSite] = useState<string | null>(
    null,
  );
  /** True once the recorded steps were verified against the DB on this load. */
  const [stepsVerified, setStepsVerified] = useState(false);
  const [hasServiceForSite, setHasServiceForSite] = useState<boolean | null>(
    null,
  );
  /** True when an active managed_wp entitlement exists AND is linked to an order (payment completed). */
  const [hasPaidForSite, setHasPaidForSite] = useState<boolean | null>(null);
  /** Starts true: the first paint waits for the reconcile answer. */
  const [isReconciling, setIsReconciling] = useState(true);

  // Bind the url ?site= param into context so the whole dashboard agrees on
  // which site the tour is configuring.
  useEffect(() => {
    if (siteFromUrl && siteFromUrl !== selectedSite) {
      setSelectedSite(siteFromUrl);
    }
  }, [siteFromUrl, selectedSite, setSelectedSite]);

  // Records one server step index and adopts the returned order.
  const completeStep = useCallback(
    async (index: number) => {
      if (!site) return;
      console.log("[completeStep] recording step:", index);
      const res = await fetch("/api/orders/setup-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, step: index }),
      });
      const body: any = (await readJson(res)) ?? {};
      console.log("[completeStep] response:", { status: res.status, body });
      if (!res.ok) {
        throw new Error(body?.message ?? body?.error ?? "Failed to record step");
      }
      // Keep the context copy of the site in step with the server so the
      // stepper, the panel and the sidebar all agree without a refetch.
      const updated: OrderData | undefined = body?.order;
      if (updated) {
        setOrders(
          orders?.map((o) =>
            o.website_name === updated.website_name ? updated : o,
          ) ?? null,
        );
      }
    },
    [site, orders, setOrders],
  );

  // Never carry state from one site into the next.
  useEffect(() => {
    setSignature(null);
    setError(null);
    setVerifyStatus("idle");
    setPlugin({ loading: false, installed: false, keyed: false });
    // A different site means a different flow: start over on its first step.
    setCurrentStep(0);
    setPositionedForSite(null);
    addSite.setExistingSite(null);
  }, [site, addSite.setExistingSite]);

  /**
   * Move the panel to the next step. Advancing from the last tour step moves
   * the panel one past the end (STEPS.length), which is what reveals the
   * payment card -- so the payment view only appears after an explicit click,
   * never automatically when the last step completes. Nothing is recorded
   * here: the plugin step was already recorded at verify time, and the final
   * step (service_active) is written by the payment webhook / reconcile.
   */
  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  }, []);

  /** Move the panel to a specific step (only if done or current). */
  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < STEPS.length) {
      setCurrentStep(index);
    }
  }, []);

  // The orders row behind the active site, straight from the dashboard context.
  const order = orders?.find((o) => o.website_name === site) ?? null;

  // Reflect the server-recorded verification on load/reload: when the order
  // row already has plugin_verified, the button starts in "verified".
  useEffect(() => {
    const tour = (order?.tour ?? {}) as Record<string, boolean>;
    if (tour.plugin_verified) setVerifyStatus("verified");
  }, [order?.tour]);

  // Payment truth merges two sources: the /paid endpoint (user_services
  // linkage, via hasPaidForSite) and the orders row flag the Stripe webhook /
  // reconcile flips (order_status). Either one means paid -- and the order
  // flag is available as soon as the verified orders list arrives, which is
  // what decides the landing spot right after a Stripe checkout return.
  const paidForSite: boolean | null =
    hasPaidForSite === true || order?.order_status === true
      ? true
      : hasPaidForSite;

  // The "add your site" step has no server key: it is satisfied the moment the
  // account has a site to configure. The orders row must actually exist: a
  // stale cached site name (from sessionStorage after a delete, or another
  // device) must not unlock the plugin steps, because wp_key and hmac both
  // require the order row.
  const isStepDone = (index: number) => {
    const step = STEPS[index];
    if (step.satisfiedBySite) {
      return Boolean(site && order);
    }
    const tour = (order?.tour ?? {}) as Record<string, boolean>;
    return Boolean(tour[step.key]);
  };

  const firstOpenIndex = STEPS.findIndex((_, i) => !isStepDone(i));
  // If every step is done, keep the last step as the current one.
  const activeIndex = firstOpenIndex === -1 ? STEPS.length - 1 : firstOpenIndex;
  const isTourComplete = STEPS.every((_, i) => i === 0 || isStepDone(i));

  // Verify the recorded steps against the DB on every page load: the context
  // may be rendering a cached (up to 5 min old) orders list, which would
  // position the panel on stale step data.
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    setStepsVerified(false);
    fetchOrders(undefined, user.id, true)
      .catch(() => {})
      .finally(() => {
        if (alive) setStepsVerified(true);
      });
    return () => {
      alive = false;
    };
  }, [user?.id, fetchOrders]);

  // One-time initial positioning per site, done only after the steps were
  // verified against the DB: land on the first incomplete step (the one right
  // after the last completed step), or on the last step when everything is
  // done. Exception: when every step is done AND the site is paid (e.g. the
  // return from Stripe checkout), land past the last step so the completion
  // page shows instead of the plugin step. After this the panel only moves
  // via Next/Back/progress-bar clicks.
  useEffect(() => {
    if (!stepsVerified) return;
    if (positionedForSite === site) return;
    if (!site) {
      // "Connect another site" mode: no site yet, the add-site card is step 0.
      setPositionedForSite(site);
      setCurrentStep(0);
      return;
    }
    // Wait for the verified orders list; a site missing from it (stale url)
    // simply lands on step 0, because isStepDone(0) needs the order row.
    if (!orders) return;
    // All steps done: the payment answer decides the landing spot, so wait
    // for it (the order flag / reconcile on the Stripe return resolve it).
    const allStepsDone = firstOpenIndex === -1;
    if (allStepsDone && paidForSite === null) return;
    setPositionedForSite(site);
    // A URL step is authoritative for the initial landing. Steps 1..N map to
    // content indices 0..N-1; the trailing Activate card is step N+1 and uses
    // STEPS.length as its internal index.
    if (
      requestedStep &&
      requestedStep >= 1 &&
      requestedStep <= STEPS.length + 1
    ) {
      setCurrentStep(
        requestedStep <= STEPS.length ? requestedStep - 1 : STEPS.length,
      );
      return;
    }
    setCurrentStep(
      allStepsDone && paidForSite ? STEPS.length : activeIndex,
    );
  }, [
    site,
    orders,
    stepsVerified,
    activeIndex,
    positionedForSite,
    firstOpenIndex,
    paidForSite,
    requestedStep,
  ]);

  // site_selected is recorded as soon as a site is active.
  useEffect(() => {
    const tour = (order?.tour ?? {}) as Record<string, boolean>;
    if (!site || !order || tour.site_selected) return;
    completeStep(0).catch(() => {});
  }, [site, order, completeStep]);

  const checkPlugin = useCallback(async () => {
    if (!site) return null;
    setPlugin((p) => ({ ...p, loading: true }));
    try {
      const res = await fetch("/api/wordpress/check-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: site }),
      });
      const body: any = await readJson(res);
      console.log("[checkPlugin] response:", { status: res.status, body });
      const found: PluginStatus = {
        loading: false,
        installed: Boolean(body?.found?.plugin),
        keyed: Boolean(body?.found?.key),
      };
      setPlugin(found);
      return found;
    } catch (err: any) {
      console.error("[checkPlugin] error:", err);
      setPlugin({ loading: false, installed: false, keyed: false });
      return null;
    }
  }, [site]);

  // Binds the signature server-side and returns it. The user never sees, copies
  // or pastes it: the downloaded plugin already carries its own access key.
  const bindSignature = useCallback(async (): Promise<string | null> => {
    if (!site) return null;
    const res = await fetch("/api/wordpress/hmac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: site }),
    });
    const body: any = await readJson(res);
    console.log("[bindSignature] response:", { status: res.status, body });
    if (!res.ok) {
      throw new Error(body?.message ?? "Failed to prepare signature");
    }
    setSignature(body?.signature);
    // No tour step is recorded here: binding a signature is an internal
    // sub-event (it clears plugin_verified server-side on re-bind), and the
    // plugin step completes only when verification succeeds.
    return body?.signature ?? null;
  }, [site]);

  /** Can this site be connected right now without a new payment? */
  const checkServiceForSite = useCallback(async () => {
    if (!user?.id) {
      setHasServiceForSite(null);
      return;
    }
    try {
      const query = site ? `?site=${encodeURIComponent(site)}` : "";
      const res = await fetch(`/api/orders/managed/available${query}`);
      if (!res.ok) return;
      const body: any = await readJson(res);
      setHasServiceForSite(Boolean(body?.available));
    } catch {
      setHasServiceForSite(false);
    }
  }, [site, user?.id]);

  /** Is there an active managed_wp entitlement linked to an order (payment done)? */
  const checkPaidForSite = useCallback(async () => {
    if (!user?.id || !site) {
      setHasPaidForSite(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/orders/managed/paid?site=${encodeURIComponent(site)}`,
      );
      if (!res.ok) {
        setHasPaidForSite(false);
        return;
      }
      const body: any = await readJson(res);
      setHasPaidForSite(Boolean(body?.paid));
    } catch {
      setHasPaidForSite(false);
    }
  }, [site, user?.id]);

  // Re-resolved whenever the active site changes, so switching sites (or asking
  // to add one) re-evaluates the gate.
  useEffect(() => {
    setHasServiceForSite(null);
    setHasPaidForSite(null);
    checkServiceForSite();
    checkPaidForSite();
  }, [checkServiceForSite, checkPaidForSite]);

  // Re-check payment status whenever orders are refetched (e.g. after the
  // reconcile endpoint provisions a missed webhook, or a manual refresh). This
  // makes sure hasPaidForSite flips to true even if the webhook was still
  // processing when the page first mounted.
  useEffect(() => {
    if (!site || !user?.id || !orders) return;
    checkPaidForSite();
  }, [orders, site, user?.id, checkPaidForSite]);

  // No service for this site yet: the webhook may have been missed (local dev
  // without Stripe and adopt the plan it reports, so a payment the customer
  // already made opens the steps here instead of showing the pay button again.
  // Also runs when we detect a return from Stripe (session_id in URL) to
  // immediately reconcile a payment whose webhook hasn't landed yet.
  useEffect(() => {
    const shouldReconcile = hasServiceForSite === false || Boolean(sessionId);

    if (!shouldReconcile) {
      setIsReconciling(false);
      return;
    }

    let alive = true;
    setIsReconciling(true);

    (async () => {
      try {
        const res = await fetch("/api/checkout/reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionId ?? null }),
        });
        if (!res.ok || !alive) return;

        const body: any = await readJson(res);
        if (!alive) return;

        if (body?.plan) {
          setPlan(body?.plan);
          setPlanExpiresAt(body?.expiresAt ?? null);
        }
        // Always force-refresh the orders list after a reconcile answer: the
        // webhook may have flipped order_status = true even when the
        // entitlement already existed (provisioned === false / "exists").
        // The force refresh also rewrites the 5-minute sessionStorage cache,
        // so the site selector on /dashboard does not keep showing "Pending".
        await fetchOrders(undefined, user?.id, true);
        // Invalidate the cached wp connection status for this site so the
        // sidebar "Setup status" dropdown refetches live wp_key state
        // (plugin installed / signature verified) instead of showing stale
        // pre-payment values cached for up to 30 days.
        if (site) {
          localStorage.removeItem(`wp-connection-status-${site}`);
        }
        if (body?.provisioned) {
          // A fresh entitlement now exists, so re-resolve the gate.
          await checkServiceForSite();
        }
        // Always re-check payment status: the webhook may have already
        // provisioned the entitlement (provisioned === false / "exists") but
        // the order flip to order_status = true still needs to be observed.
        await checkPaidForSite();
      } catch {
        // fail soft: the gate simply stays up and can be retried
      } finally {
        // Whatever the answer, stop blocking the first paint on it.
        if (alive) setIsReconciling(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    hasServiceForSite,
    sessionId,
    setPlan,
    setPlanExpiresAt,
    fetchOrders,
    checkServiceForSite,
    checkPaidForSite,
    user?.id,
  ]);

  /** Connects the typed domain, then makes it the active site for the tour. */
  async function createSite() {
    const created = await addSite.handleAddWebsite();
    if (!created) return;

    setSelectedSite(created);
    // Drop the 5-minute orders cache first: it still holds the list from before
    // this site existed, which would hide the new site and make the url site
    // unmatchable (sending the layout and the context into a switch loop).
    sessionStorage.removeItem("orders");
    sessionStorage.removeItem("orders-ts");
    try {
      await fetchOrders(undefined, user?.id);
    } catch {
      // non-fatal: the site is selected either way
    }

    // Advance the tour onto the site that was just created. Until the url
    // carries ?site=, the ?intent=new-site branch pins activeSite to "" (that
    // is what keeps the add-site card open while nothing is connected), so
    // without this swap the tour sits on step 1 showing the success message
    // instead of moving on to the plugin step. Orders are refetched above
    // first so the new site is already in the list when the url resolves.
    router.replace(`/dashboard/onboarding?site=${created}`);
  }

  async function downloadPlugin(download: (domain: string) => Promise<void>) {
    if (!site) return;
    setBusy("download");
    setError(null);
    try {
      // The zip is self-contained -- its access key comes from plugin-key -- so
      // a signature-binding failure must never block the download. Binding is
      // best-effort here: verify re-issues it and reports the problem there,
      // where the user can actually do something about it.
      await download(site);
      await bindSignature().catch((err) => {
        console.error("Failed to bind the signature:", err);
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function verifyInstallation() {
    if (!site) return;
    setVerifyStatus("verifying");
    setError(null);
    try {
      // First, check if the plugin is installed and has the key
      const found = await checkPlugin();
      console.log("[verifyInstallation] plugin check:", found);

      if (!found?.installed) {
        setError(
          "We can't verify the plugin for this site yet. Please install and activate the plugin first, then try again.",
        );
        setVerifyStatus("idle");
        return;
      }

      if (!found?.keyed) {
        setError(
          "Plugin is installed but not yet authenticated. Please wait a moment and try again.",
        );
        setVerifyStatus("idle");
        return;
      }

      // The binding may predate this session (a reload between the two steps),
      // so re-issue it when the in-memory signature is gone.
      const bound = signature ?? (await bindSignature());
      console.log("[verifyInstallation] bound:", bound);
      if (!bound) throw new Error("No signature bound for this site");

      const res = await fetch("/api/wordpress/hmac/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: site, signature: bound }),
      });
      const body: any = await readJson(res);
      console.log("[verifyInstallation] response:", {
        status: res.status,
        body,
      });
      if (!res.ok) {
        throw new Error(body?.message ?? body?.reason ?? "Verification failed");
      }
      // Record the plugin step (plugin_verified, index 1). The setup-step
      // route validates it against wp_key.hmac_verified_at, which this
      // verify call just stamped.
      await completeStep(1);
      // Result arrived: leave the button in its terminal state.
      setVerifyStatus("verified");
    } catch (err: any) {
      console.error("[verifyInstallation] error:", err);
      // A missing HMAC secret is our configuration problem, not the user's, so
      // say what to do about it instead of showing a bare variable name.
      const message = err?.message ?? "Verification failed";
      setError(
        message.includes("WP_HMAC_SECRET")
          ? `${message} - the service is not fully configured on our side yet. Please open a support ticket and we will finish the setup for you.`
          : message,
      );
      // Failed: back to idle so the user can simply click again.
      setVerifyStatus("idle");
    }
  }

  async function startPayment() {
    // Guard: if this site is already paid, don't create another checkout
    // session — just treat it as done.
    if (hasPaidForSite === true) {
      router.push(`/dashboard?site=${site}`);
      return;
    }

    const order = orders?.find((o) => o.website_name === site);

    // Guard: if the order row already shows paid, don't charge again.
    if (order?.order_status === true) {
      setHasPaidForSite(true);
      router.push(`/dashboard?site=${site}`);
      return;
    }

    // Pre-flight check: re-verify payment status right before charging.
    // This catches payments that completed (webhook fired) after the page
    // first loaded but before the user clicked pay again.
    try {
      const paidRes = await fetch(
        `/api/orders/managed/paid?site=${encodeURIComponent(site ?? "")}`,
      );
      if (paidRes.ok) {
        const paidBody = await readJson(paidRes);
        if (paidBody?.paid === true) {
          setHasPaidForSite(true);
          router.push(`/dashboard?site=${site}`);
          return;
        }
      }
    } catch {
      // Fail soft: fall through to the existing checkout flow.
    }

    setBusy("payment");
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceKey: "managed_wp",
          order_id: order?.order_id ?? null,
          website_name: order?.website_name ?? null,
        }),
      });
      const body: any = await readJson(res);
      if (!res.ok || !body?.url) {
        throw new Error(body?.error ?? "Failed to start checkout");
      }
      window.location.href = body?.url;
    } catch (err: any) {
      setError(err.message);
      setBusy(null);
    }
  }

  return {
    order,
    isLoading: !orders,
    isStepDone,
    isTourComplete,
    stepsVerified,
    isPositioned: positionedForSite === site,
    hasServiceForSite,
    hasPaidForSite: paidForSite,
    isReconciling,
    plugin,
    verifyStatus,
    busy,
    error,
    currentStep,
    goNext,
    goToStep,
    siteInput: addSite.input,
    setSiteInput: addSite.setInput,
    wpLoginUrl: addSite.wpLoginUrl,
    setWpLoginUrl: addSite.setWpLoginUrl,
    existingSite: addSite.existingSite,
    addingSite: addSite.isProcessing,
    addSiteError: addSite.error,
    addSiteSuccess: addSite.success,
    createSite,
    downloadPlugin,
    verifyInstallation,
    startPayment,
  };
}
/**
 * Reads a fetch response as JSON without throwing when the body is not JSON.
 * A crashed handler answers with plain text ("Internal Server Error"), which
 * otherwise surfaces as a raw "Unexpected token" error.
 */
async function readJson(res: Response): Promise<any> {
  const raw = await res.text();
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
