"use client";

import { useCallback, useEffect, useState } from "react";
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

export type OnboardingTour = {
  order: OrderData | null;
  isLoading: boolean;
  isStepDone: (index: number) => boolean;
  /** First step that is not done yet; the last step once the tour is finished. */
  activeIndex: number;
  completedCount: number;
  /** True once every recorded step of the tour is done. */
  isTourComplete: boolean;
  plugin: PluginStatus;
  /** True once this session has actually asked the site about the plugin. */
  hasProbed: boolean;
  /** True while we keep re-checking after the user confirmed the install. */
  polling: boolean;
  busy: string | null;
  error: string | null;
  /**
   * True when this site can be configured without a new payment. There is no
   * free tier and each managed_wp entitlement covers one site, so a brand-new
   * site needs an unused entitlement -- which is why unconnected sites start
   * with payment. null = not resolved yet.
   */
  hasServiceForSite: boolean | null;
  /** True while a missed-webhook reconcile is in flight. */
  isReconciling: boolean;
  /** Step shown in the content panel; null follows the active step. */
  viewedStep: number | null;
  setViewedStep: (index: number | null) => void;
  // "add your site" step
  siteInput: string;
  setSiteInput: (value: string) => void;
  addingSite: boolean;
  addSiteError: string | null;
  addSiteSuccess: string | null;
  addSiteLog: string[];
  createSite: () => Promise<void>;
  // later steps
  /** Binds the HMAC silently and runs the given plugin zip downloader. */
  downloadPlugin: (
    download: (domain: string) => Promise<void>,
  ) => Promise<void>;
  /** Asks the site about the plugin once, for the re-check buttons. */
  checkPlugin: () => void;
  confirmPluginInstalled: () => Promise<void>;
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
): OnboardingTour {
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
  const [hasProbed, setHasProbed] = useState(false);
  const [polling, setPolling] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewedStep, setViewedStep] = useState<number | null>(null);
  const [hasServiceForSite, setHasServiceForSite] = useState<boolean | null>(
    null,
  );
  /** Starts true: the first paint waits for the reconcile answer. */
  const [isReconciling, setIsReconciling] = useState(true);

  // Bind the url ?site= param into context so the whole dashboard agrees on
  // which site the tour is configuring.
  useEffect(() => {
    if (siteFromUrl && siteFromUrl !== selectedSite) {
      setSelectedSite(siteFromUrl);
    }
  }, [siteFromUrl, selectedSite, setSelectedSite]);

  // Never carry state from one site into the next.
  useEffect(() => {
    setSignature(null);
    setError(null);
    setPlugin({ loading: false, installed: false, keyed: false });
    setHasProbed(false);
    setPolling(false);
    setViewedStep(null);
  }, [site]);

  // The orders row behind the active site, straight from the dashboard context.
  const order = orders?.find((o) => o.website_name === site) ?? null;

  // The "add your site" step has no server key: it is satisfied the moment the
  // account has a site to configure. The orders row must actually exist: a
  // stale cached site name (from sessionStorage after a delete, or another
  // device) must not unlock the plugin steps, because wp_key and hmac both
  // require the order row.
  const isStepDone = (index: number) => {
    const step = STEPS[index];
    if (step.satisfiedBySite && step.records.length === 0) {
      return Boolean(site && order);
    }
    const tour = (order?.tour ?? {}) as Record<string, boolean>;
    return Boolean(tour[step.key]);
  };

  const firstOpenIndex = STEPS.findIndex((_, i) => !isStepDone(i));
  // If every step is done, keep the last step as the current one.
  const activeIndex = firstOpenIndex === -1 ? STEPS.length - 1 : firstOpenIndex;
  const completedCount = STEPS.filter((_, i) => isStepDone(i)).length;
  const isTourComplete = STEPS.every(
    (_, i) => i === 0 || isStepDone(i),
  );

  // Records one server step index and adopts the returned order.
  const completeStep = useCallback(
    async (index: number) => {
      if (!site) return;
      const res = await fetch("/api/orders/setup-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, step: index }),
      });
      const body: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message ?? body.error ?? "Failed to record step");
      }
      // Keep the context copy of the site in step with the server so the
      // stepper, the panel and the sidebar all agree without a refetch.
      const updated: OrderData | undefined = body.order;
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

  // Records every server index behind one tour step.
  const completeTourStep = useCallback(
    async (index: number) => {
      for (const serverIndex of STEPS[index].records) {
        await completeStep(serverIndex);
      }
    },
    [completeStep],
  );

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
      const body: any = res.ok ? await res.json() : {};
      const found: PluginStatus = {
        loading: false,
        installed: Boolean(body?.found?.plugin),
        keyed: Boolean(body?.found?.key),
      };
      setPlugin(found);
      setHasProbed(true);
      return found;
    } catch {
      setPlugin({ loading: false, installed: false, keyed: false });
      setHasProbed(true);
      return null;
    }
  }, [site]);

  /** One-off check behind the re-check buttons (no polling). */
  const probeOnce = useCallback(() => {
    checkPlugin();
  }, [checkPlugin]);

  // Nothing is checked until the user says the plugin is active; from then on
  // we re-check every 8s until the site answers, then the step records itself.
  useEffect(() => {
    if (!polling) return;
    let cancelled = false;

    const poll = async () => {
      const found = await checkPlugin();
      if (cancelled || !found?.installed || !found.keyed) return;
      setPolling(false);
      completeTourStep(1).catch(() => {});
    };

    const timer = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [polling, checkPlugin, completeTourStep]);

  // The retry loop only makes sense while the plugin step is the open one.
  useEffect(() => {
    if (polling && activeIndex !== 1) setPolling(false);
  }, [polling, activeIndex]);

  // Binds the signature server-side and returns it. The user never sees, copies
  // or pastes it: the downloaded plugin already carries its own access key.
  const bindSignature = useCallback(async (): Promise<string | null> => {
    if (!site) return null;
    const res = await fetch("/api/wordpress/hmac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: site }),
    });
    const body: any = await res.json();
    if (!res.ok) {
      throw new Error(body.message ?? "Failed to prepare signature");
    }
    setSignature(body.signature);
    // signature_bound is recorded the moment the plugin is handed out.
    await completeStep(1);
    return body.signature ?? null;
  }, [site, completeStep]);

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
      const body: any = await res.json();
      setHasServiceForSite(Boolean(body.available));
    } catch {
      setHasServiceForSite(false);
    }
  }, [site, user?.id]);

  // Re-resolved whenever the active site changes, so switching sites (or asking
  // to add one) re-evaluates the gate.
  useEffect(() => {
    setHasServiceForSite(null);
    checkServiceForSite();
  }, [checkServiceForSite]);

  // No service for this site yet: the webhook may have been missed (local dev
  // without Stripe and adopt the plan it reports, so a payment the customer
  // already made opens the steps here instead of showing the pay button again.
  useEffect(() => {
    if (hasServiceForSite !== false) {
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
          body: JSON.stringify({}),
        });
        if (!res.ok || !alive) return;

        const body: any = await res.json();
        if (!alive) return;

        if (body?.plan) {
          setPlan(body.plan);
          setPlanExpiresAt(body.expiresAt ?? null);
        }
        if (body?.provisioned) {
          await fetchOrders(undefined, user?.id);
          // A fresh entitlement now exists, so re-resolve the gate.
          await checkServiceForSite();
        }
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
    setPlan,
    setPlanExpiresAt,
    fetchOrders,
    checkServiceForSite,
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
  }

  async function downloadPlugin(
    download: (domain: string) => Promise<void>,
  ) {
    if (!site) return;
    setBusy("download");
    setError(null);
    try {
      // The zip is self-contained -- its access key comes from wp-secret -- so
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

  async function confirmPluginInstalled() {
    setBusy("plugin");
    setError(null);
    try {
      const found = await checkPlugin();
      if (found?.installed && found.keyed) {
        await completeTourStep(1);
      } else {
        // Not visible yet: keep looking so the user never has to click twice.
        setPolling(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function verifyInstallation() {
    if (!site) return;
    setBusy("verify");
    setError(null);
    try {
      // The binding may predate this session (a reload between the two steps),
      // so re-issue it when the in-memory signature is gone.
      const bound = signature ?? (await bindSignature());
      if (!bound) throw new Error("No signature bound for this site");

      const res = await fetch("/api/wordpress/hmac/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: site, signature: bound }),
      });
      const body: any = await res.json();
      if (!res.ok) {
        throw new Error(body.message ?? body.reason ?? "Verification failed");
      }
      // Verification stamps the signature binding and the collector assignment
      // server-side, so this one write completes the whole plugin step.
      await completeTourStep(1);
    } catch (err: any) {
      // A missing HMAC secret is our configuration problem, not the user's, so
      // say what to do about it instead of showing a bare variable name.
      const message = err?.message ?? "Verification failed";
      setError(
        message.includes("WP_HMAC_SECRET")
          ? `${message} - the service is not fully configured on our side yet. Please open a support ticket and we will finish the setup for you.`
          : message,
      );
    } finally {
      setBusy(null);
    }
  }

  async function startPayment() {
    if (!site) return;
    setBusy("payment");
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey: "managed_wp" }),
      });
      const body: any = await res.json();
      if (!res.ok || !body.url) {
        throw new Error(body.error ?? "Failed to start checkout");
      }
      window.location.href = body.url;
    } catch (err: any) {
      setError(err.message);
      setBusy(null);
    }
  }

  return {
    order,
    isLoading: !orders,
    isStepDone,
    activeIndex,
    completedCount,
    isTourComplete,
    hasServiceForSite,
    isReconciling,
    plugin,
    hasProbed,
    polling,
    busy,
    error,
    viewedStep,
    setViewedStep,
    siteInput: addSite.input,
    setSiteInput: addSite.setInput,
    addingSite: addSite.isProcessing,
    addSiteError: addSite.error,
    addSiteSuccess: addSite.success,
    addSiteLog: addSite.log,
    createSite,
    downloadPlugin,
    checkPlugin: probeOnce,
    confirmPluginInstalled,
    verifyInstallation,
    startPayment,
  };
}