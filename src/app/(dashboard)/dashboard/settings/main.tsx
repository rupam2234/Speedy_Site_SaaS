"use client";

import { Globe, LoaderIcon } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { OrderData } from "@/app/api";
import { useSiteContext } from "../siteContext";
import { toast } from "sonner";
import { LoadingAnimation } from "@/components/theme/loadingAnimation";
import Integrations, { CfConnection } from "./integrations";
import { getRateLimiter, setRatelimiter } from "@/components/utils";
import { cn } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Connection status types (matching the API)
type ConnectionStatusType =
  | "unknown"
  | "pending"
  | "connected"
  | "verified"
  | "expired"
  | "error";

interface ConnectionStatus {
  status: ConnectionStatusType;
  message: string;
  details: {
    pluginInstalled: boolean;
    pluginActive: boolean;
    rumActive: boolean;
    hasSecret: boolean;
    hasSignature: boolean;
    signatureExpired: boolean;
    hmacVerifiedAt: string | null;
    rumAssignedAt: string | null;
    entitled: boolean;
    hmacExpiresAt: string | null;
  };
  checkedAt: number;
}

export default function Main() {
  const [siteData, setSiteData] = useState<OrderData>();
  const { selectedSite, role, roleLoading } = useSiteContext();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [cloudflareStatus, setCloudflareStatus] = useState<CfConnection>({
    isConnected: false,
    key: "",
  });
  const [isDeleting, setDeleting] = useState<boolean>(false);

  // WordPress connection status
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isDownloadingPlugin, setIsDownloadingPlugin] = useState(false);

  // Check connection with API
  const checkConnection = useCallback(async () => {
    if (!selectedSite) return;

    setIsCheckingConnection(true);
    try {
      const res = await fetch("/api/wordpress/connection-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ domain: selectedSite }),
      });

      // The route can answer with a plain-text error page (crashed handler,
      // proxy error, ...), so the body is parsed defensively instead of
      // letting res.json() throw a raw SyntaxError at the user.
      const data: any = await readJson(res);

      if (res.ok && data?.status) {
        const status: ConnectionStatus = {
          status: data.status,
          message: data.message,
          details: data.details,
          checkedAt: Date.now(),
        };
        setConnectionStatus(status);
      } else {
        const status: ConnectionStatus = {
          status: "error",
          message:
            data?.error ||
            data?.message ||
            (res.ok
              ? "Unexpected response from the server"
              : `Connection check failed (HTTP ${res.status})`),
          details: {
            pluginInstalled: false,
            pluginActive: false,
            rumActive: false,
            hasSecret: false,
            hasSignature: false,
            signatureExpired: false,
            hmacVerifiedAt: null,
            rumAssignedAt: null,
            entitled: false,
            hmacExpiresAt: null,
          },
          checkedAt: Date.now(),
        };
        setConnectionStatus(status);
      }
    } catch (err: any) {
      const status: ConnectionStatus = {
        status: "error",
        message: err.message || "Network error",
        details: {
          pluginInstalled: false,
          pluginActive: false,
          rumActive: false,
          hasSecret: false,
          hasSignature: false,
          signatureExpired: false,
          hmacVerifiedAt: null,
          rumAssignedAt: null,
          entitled: false,
          hmacExpiresAt: null,
        },
        checkedAt: Date.now(),
      };
      setConnectionStatus(status);
    } finally {
      setIsCheckingConnection(false);
    }
  }, [selectedSite]);

  /**
   * Re-downloads the WordPress plugin, e.g. when the user wants to reinstall
   * it. The access key is resolved server-side from the database, so the copy
   * that gets installed keeps the key the site is already bound to.
   */
  const downloadPlugin = async () => {
    if (!selectedSite) return;

    setIsDownloadingPlugin(true);
    try {
      // JSZip is only needed for the download itself, so it stays out of the
      // initial bundle. This is the exact same download path used by onboarding.
      const { downloadPluginZip } =
        await import("../wordpress-plugin-analysis/companionPlugin");
      await downloadPluginZip(selectedSite);

      toast.success(
        "Plugin downloaded with your site's current access key. Upload the zip in WordPress to reinstall it.",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to download the plugin");
    } finally {
      setIsDownloadingPlugin(false);
    }
  };

  // Clear the previous site's state immediately, then run a live check.
  useEffect(() => {
    setConnectionStatus(null);
  }, [selectedSite]);

  // Always re-check the live connection status when the page is opened.
  useEffect(() => {
    if (!selectedSite || roleLoading || role !== "user") return;
    checkConnection();
  }, [selectedSite, role, roleLoading, checkConnection]);

  useEffect(() => {
    fetchDomainData(selectedSite);
  }, [selectedSite]);

  // The plugin download is always offered on the WordPress row, no matter what
  // state the connection check is in.
  const downloadPluginButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={downloadPlugin}
      disabled={isDownloadingPlugin}
      className="h-7 shrink-0 px-2 text-xs"
    >
      {isDownloadingPlugin ? "Preparing..." : "Download plugin"}
    </Button>
  );

  // Status indicator for the WordPress row. It lives in its own slot so the
  // action buttons stay exactly where they are while the live check runs.
  // A cached status stays visible (with a small spinner next to it) while the
  // live check refreshes it, so nothing blanks out in the middle of the page.
  const wordpressStatusNode = roleLoading ? null : connectionStatus ? (
    <>
      <StatusPill
        tone={
          connectionStatus.details.pluginActive &&
          connectionStatus.details.entitled
            ? "positive"
            : "negative"
        }
      >
        {connectionStatus.details.pluginActive &&
        connectionStatus.details.entitled
          ? "Connected"
          : connectionStatus.message}
      </StatusPill>
      {isCheckingConnection && (
        <LoaderIcon size={14} className="animate-spin text-muted-foreground" />
      )}
    </>
  ) : (
    <LoaderIcon size={14} className="animate-spin text-muted-foreground" />
  );

  const formattedDate = new Date(siteData?.order_date ?? "").toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    },
  );

  if (!selectedSite) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Page header */}
      <div className="space-y-1.5">
        <h1 className="font-bold uppercase tracking-widest">
          Configuration | Site Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage integrations and reporting for{" "}
          <span className="font-medium text-foreground">{selectedSite}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Site Info Card */}
        <Card className="col-span-1 lg:col-span-4 h-fit gap-0 py-0 rounded-sm">
          <CardHeader className="px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Globe className="size-4 text-muted-foreground" />
              Site Information
            </CardTitle>
            <CardAction className="flex items-center gap-1">
              {confirmingDelete ? (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={deleteSite}
                    disabled={isDeleting}
                    className="h-7 px-2 text-xs"
                  >
                    {isDeleting ? (
                      <LoaderIcon className="size-3 animate-spin" />
                    ) : (
                      "Confirm"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={isDeleting}
                    className="h-7 px-2 text-xs text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toast.info("Edit feature coming soon")}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmingDelete(true)}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Delete
                  </Button>
                </>
              )}
            </CardAction>
          </CardHeader>

          <CardContent className="px-6 pb-5 pt-0">
            <div className="divide-y divide-border/70">
              {/* Website */}
              {/* <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm text-muted-foreground">Website</span>
                {!siteData ? (
                  <div className="h-4 w-28 rounded-md bg-primary/20 animate-pulse" />
                ) : (
                  <p className="truncate text-sm font-medium text-foreground">
                    {siteData?.website_name}
                  </p>
                )}
              </div> */}

              {/* Created */}
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm text-muted-foreground">Created</span>
                {!siteData ? (
                  <div className="h-4 w-28 rounded-md bg-primary/20 animate-pulse" />
                ) : (
                  <span className="text-sm font-medium text-foreground">
                    {formattedDate}
                  </span>
                )}
              </div>

              {/*RUM connection Status */}
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm text-muted-foreground">
                  RUM Status
                </span>
                {!connectionStatus ? (
                  <div className="h-4 w-28 rounded-md bg-primary/20 animate-pulse" />
                ) : (
                  <StatusPill
                    tone={
                      connectionStatus.details.rumActive
                        ? "positive"
                        : "negative"
                    }
                  >
                    {connectionStatus.details.rumActive
                      ? "Running"
                      : "Not active"}
                  </StatusPill>
                )}
              </div>

              {/* cloudflare connection */}
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Cloudflare
                </span>
                {!siteData || cloudflareStatus === null ? (
                  <div className="h-4 w-28 rounded-md bg-primary/20 animate-pulse" />
                ) : cloudflareStatus.isConnected && cloudflareStatus.key ? (
                  <StatusPill tone="positive">Connected</StatusPill>
                ) : (
                  <StatusPill tone="negative">Not connected</StatusPill>
                )}
              </div>

              {/* wordpress connection */}
              {selectedSite && (roleLoading || role === "user") && (
                <div className="flex flex-col gap-2 py-3">
                  <span className="text-sm text-muted-foreground">
                    WordPress
                  </span>
                  {/* The row renders together with the other site information
                      rows. The action buttons are usable immediately and the
                      live status check then runs on the client. */}
                  <div className="flex min-w-0 items-center gap-2">
                    {/* Status slot: it absorbs the free space, so the action
                        buttons keep their position in every state and the
                        pill sits right next to them (like the other rows). */}
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      {wordpressStatusNode}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={checkConnection}
                        disabled={isCheckingConnection}
                        className="h-7 shrink-0 px-2 text-xs"
                      >
                        Recheck
                      </Button>
                      {downloadPluginButton}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Integrations - Wider Section */}
        <div className="col-span-1 lg:col-span-8">
          <Integrations />
        </div>
      </div>
    </div>
  );

  async function fetchDomainData(selectedSite: string) {
    if (!selectedSite) return;

    const cfKey = `${selectedSite}-cloudflare-status`;
    const expiry = 5 * 60 * 1000; // five minutes

    // Check site data cache

    const cachedDomainData = sessionStorage.getItem("orders");
    let filteredDomainData;

    if (cachedDomainData) {
      const temp = JSON.parse(cachedDomainData);

      filteredDomainData =
        temp !== null && temp.length > 0
          ? temp.filter((x: OrderData) => x.website_name === selectedSite)
          : [];
    }

    if (filteredDomainData.length > 0) {
      setSiteData(filteredDomainData[0]);
    } else {
      try {
        const siteRes = await fetch("/api/orders/get-site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: selectedSite }),
        });

        const siteBody: { message?: string; data?: any[]; status: number } =
          (await readJson(siteRes)) ?? {};

        if (!siteRes.ok || !siteBody?.data || !siteBody.data.length) {
          setSiteData(undefined);
          throw new Error(siteBody?.message || "Failed to fetch site data");
        }

        const siteData = siteBody?.data?.[0];
        setSiteData(siteData);
      } catch (error) {
        console.error("Error fetching site data:", error);
        return;
      }
    }

    // Check Cloudflare status cache
    const cachedCFStatus = getRateLimiter(cfKey);

    if (cachedCFStatus) {
      setCloudflareStatus(cachedCFStatus);
    } else {
      try {
        const cfRes = await fetch("/api/cloudflare/check-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: siteData?.user_id,
            site_id: siteData?.order_id,
          }),
        });

        const cfData: { found?: boolean; key?: string; message?: string } =
          (await readJson(cfRes)) ?? {};

        const status = {
          isConnected: cfData?.found ?? false,
          key: cfData?.key,
        };

        setCloudflareStatus(status);
        setRatelimiter({ key: cfKey, ttl: expiry, value: status });

        if (!cfRes.ok) {
          throw new Error(
            cfData?.message || "Failed to fetch Cloudflare status",
          );
        }
      } catch (error) {
        console.error("Error fetching Cloudflare status:", error);
      }
    }
  }

  async function deleteSite() {
    if (!selectedSite) return;

    setDeleting(true);

    try {
      const res = await fetch("/api/orders/delete-site", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ domain: selectedSite }),
      });

      const body: any = await readJson(res);

      if (!res.ok) {
        const message =
          body?.message ??
          body?.error ??
          `Failed to delete site (HTTP ${res.status})`;
        toast.error(message, {
          style: { backgroundColor: "#FF9898", color: "white" },
        });
        setDeleting(false);
        throw new Error(message);
      }

      toast.success("Website deleted", {
        style: { backgroundColor: "#66cc8f", color: "white" },
      });

      // Give the toast a beat, then land on the dashboard root -- a relative
      // path, so it resolves identically locally and in production -- where
      // the next available site is picked automatically. The caches are
      // cleared first: the site context re-hydrates orders and the selected
      // site from sessionStorage before paint, and a stale selected site
      // would point the dashboard straight back at the deleted one.
      setTimeout(() => {
        sessionStorage.removeItem("orders");
        sessionStorage.removeItem("orders-ts");
        sessionStorage.removeItem("selected-site");
        // Clear ALL WordPress connection caches (any domain format, e.g.
        // www.example.com vs example.com) so a freshly re-added site can't
        // inherit a stale "verified" status from the deleted order's wp_key row.
        Object.keys(localStorage)
          .filter((key) => key.startsWith("wp-connection-status-"))
          .forEach((key) => localStorage.removeItem(key));
        Object.keys(sessionStorage)
          .filter((key) => key.startsWith("wp-connection-status-"))
          .forEach((key) => sessionStorage.removeItem(key));
        window.location.href = "/dashboard";
      }, 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }
}

/**
 * Small status indicator used across the settings cards. A coloured dot plus
 * a tinted pill reads far more clearly than bare coloured text, especially in
 * dark mode where the raw green/red text loses contrast.
 */
function StatusPill({
  tone,
  children,
}: {
  tone: "positive" | "negative";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        // min-w-0 + truncate lets a long message (e.g. a server error string)
        // shrink instead of pushing the action buttons out of the row.
        "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        tone === "positive"
          ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
          : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
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
