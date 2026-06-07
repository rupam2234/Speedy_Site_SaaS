"use client";

import { OrderData } from "@/app/api";
import { useState } from "react";
import { useSupabaseUser } from "../utils/supabase/AuthProvider";
import { cachedData } from "../utils";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  LoaderCircle,
} from "lucide-react";

interface Props {
  setDisplay: ({ display }: { display: boolean }) => void;
}

type Steps =
  | "idle"
  | "validating"
  | "fetching favicon"
  | "upload failed"
  | "creating order"
  | "error"
  | "done"
  | "Site limit reached";

export function AddNewWebsite({ setDisplay }: Props) {
  const [isProcessing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [input, setInput] = useState<string>("");
  const user = useSupabaseUser();

  // for optional RUM script configuration
  const [showConfig, setShowConfig] = useState(false);

  const [siteId, setSiteId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const id = siteId?.split?.("-")?.[0] ?? "missing-id";

  const trackingScript =
    success && siteId
      ? `<script src="https://rum.speedy.site/rum.js?v=0.0.1&id=${id}" defer></script>`
      : "";

  const handleCopy = () => {
    if (!trackingScript) return;
    navigator.clipboard.writeText(trackingScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-secondary-background border border-[#141414] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-[16px_16px_0px_0px_rgba(20,20,20,1)]">
        <div className="p-6 border-b border-[#141414] flex justify-between items-center bg-[#141414] text-[#E4E3E0]">
          <h3 className="font-bold uppercase tracking-widest text-sm">
            Add New Website
          </h3>

          <button
            onClick={() => setDisplay({ display: false })}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          <p className="text-sm text-primary/60 mb-6">
            Enter the primary domain you want to track to enable UX, performance
            and experience monitoring.
          </p>

          <form
            className="flex gap-3 items-center mb-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleAddWebsite();
            }}
          >
            <input
              type="text"
              required
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="www.speedy.site"
              disabled={isProcessing}
              className="border border-[#141414]/30 rounded-sm px-3 py-2 text-sm w-full max-w-xs outline-none focus:border-[#141414]"
            />

            <button
              disabled={isProcessing}
              onClick={() => {
                return (document.getElementById("log")!.textContent = "");
              }}
              className="bg-green-300 border border-[#141414] px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-green-500 transition-all"
            >
              {isProcessing ? (
                <LoaderCircle
                  size={16}
                  className="text-primary/20 min-w-14 animate-spin transition-all delay-300"
                />
              ) : (
                "Add Site"
              )}
            </button>
          </form>

          <div className="mt-6">
            <h4 className="font-bold uppercase text-xs mb-2 text-primary/80">
              Progress
            </h4>

            <pre
              id="log"
              className="text-black dark:text-amber-300 bg-gray-50 p-4 border border-[#141414]/20 rounded-sm text-xs font-mono h-40 overflow-y-auto"
            />
          </div>

          {error && (
            <p className="mt-2 text-red-500 font-medium text-xs mb-4">
              {error}
            </p>
          )}

          {success !== null && (
            <div className="mt-2 space-y-3">
              {/* Success Message */}
              <div className="flex items-center gap-2 text-emerald-600 font-medium capitalize text-sm">
                {success}
              </div>

              <div className="text-xs text-primary/80">
                (Optional) you may set up the user experience monitoring script
                now, or reload this page to skip. You can configure it later
                from the site Settings.
              </div>

              {/* Optional Action Dropdown */}
              <div className="border border-primary/20 rounded-sm overflow-hidden transition-all bg-card/50">
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="w-full flex items-center justify-between p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-primary" />
                    <span>Quick RUM Configuration</span>
                  </div>
                  {showConfig ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showConfig && (
                  <div className="p-4 pt-2 space-y-3 animate-in fade-in slide-in-from-top-1">
                    <p className="text-xs text-muted-foreground">
                      Paste this snippet into your site&apos;s{" "}
                      <code className="text-primary font-bold">
                        &lt;head&gt;
                      </code>{" "}
                      tag to start tracking users on your site.
                    </p>

                    <div className="relative group">
                      <pre className="p-3 rounded-sm text-[11px] font-mono overflow-x-auto border border-white/10 bg-primary/80 text-primary-foreground break-all whitespace-pre-wrap leading-relaxed">
                        {trackingScript}
                      </pre>

                      <button
                        onClick={handleCopy}
                        className="absolute right-2 top-2 p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm border border-white/10"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <div className="text-[10px] text-muted-foreground/60"></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#141414] flex gap-3 justify-end">
          {success !== null && (
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 border border-[#141414] uppercase font-bold text-xs tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
            >
              Refresh Page
            </button>
          )}
          <button
            onClick={() => setDisplay({ display: false })}
            className="px-6 py-3 border border-[#141414] uppercase font-bold text-xs tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  async function handleAddWebsite() {
    setProcessing(true);
    setError(null);
    setSuccess(null);

    // checks website limit
    const limit = await checkSiteLimit();

    if (limit?.reachedLimit) {
      appendLog("Site limit reached");
      setError(
        "You have reached site limit. Either upgrade your plan or delete a site",
      );
      setProcessing(false);
      return;
    }

    appendLog("validating");
    const cleanDomain = extractRootDomain(input?.trim());

    if (!cleanDomain) {
      setError("Please enter a valid domain (e.g., example.com)");
      appendLog("error");
      setProcessing(false);
      return;
    }

    let favicon_file = null;
    const favicon = await getFavicon(cleanDomain);

    appendLog("fetching favicon");
    if (favicon) {
      try {
        favicon_file = await uploadFavicon(favicon, cleanDomain);

        if (!favicon_file) {
          appendLog("upload failed");
          throw new Error("favicon upload failed! skipping...");
        }
      } catch (error) {
        console.error(error);
      }
    }

    appendLog("creating order");
    const res = await addOrder(favicon_file, cleanDomain);

    if (!res) {
      setError("Unexpected error occurred.");
      appendLog("error");
      setProcessing(false);
      return;
    }

    if (res.status === 409) {
      setError(
        res.body.message ||
          "Site already exists. Please check your site list or contact support",
      );
      appendLog("error");
      setProcessing(false);
      return;
    }

    // Handle other errors
    if (res.status !== 200) {
      setError(res.body.message || "Failed to create site.");
      appendLog("error");
      setProcessing(false);
      return;
    }

    // set order id
    setSiteId(res?.body?.order?.order_id ?? "");
    appendLog("done");
    setSuccess("Website configured.");
    setProcessing(false);
  }

  async function addOrder(
    uploadedFavicon: string | null,
    domain: string,
  ): Promise<{ status: number; body: any } | null> {
    if (!domain) return null;

    const orderData: OrderData = {
      order_status: true,
      website_address: `https://${domain}`,
      website_name: domain,
      favicon_file: uploadedFavicon,
    };

    const key = `orders`;

    try {
      const { response } = await cachedData({
        fn: async () => {
          const res = await fetch("/api/orders/newOrder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderData, user_id: user?.id }),
          });

          const body = await res.json();

          return { status: res.status, body };
        },
        session_Storage: true,
        ttl: 5 * 60 * 1000,
        key,
      });

      return response;
    } catch (error: any) {
      return { status: 500, body: { message: error.message } };
    }
  }
}

function extractRootDomain(value: string): string | null {
  try {
    if (!/^https?:\/\//i.test(value)) {
      value = "https://" + value;
    }

    const url = new URL(value);
    const hostname = url.hostname;

    if (
      hostname === "localhost" ||
      /^[\d.]+$/.test(hostname) || // IP address
      !hostname.includes(".") ||
      hostname.endsWith(".") ||
      hostname.startsWith(".")
    ) {
      return null;
    }

    return hostname; // keeps 'www' and subdomains
  } catch {
    return null;
  }
}

async function getFavicon(domain: string): Promise<string | null> {
  if (!domain) {
    return null;
  }

  try {
    const res = await fetch("/api/favicons/fetch_single", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ website: domain }),
    });

    if (!res.ok) {
      // Handle non-2xx responses
      const errorBody: any = await res.json();
      console.error(
        "Favicon fetch failed:",
        errorBody.message || res.statusText,
      );
      return null;
    }

    const body: any = await res.json();
    // Safely access nested property
    return body.faviconData?.favicon || null;
  } catch (err) {
    console.error("Error during favicon fetch:", err);
    return null;
  }
}

function appendLog(stage: Steps) {
  const logs = document.getElementById("log");

  const log = `${new Date().toLocaleTimeString()}: ${stage}\n`;
  if (logs) {
    logs.textContent = logs?.textContent + log;
  }
}

async function uploadFavicon(
  faviconFile: string,
  domain: string,
): Promise<string | null> {
  if (!faviconFile) return null;

  try {
    const res = await fetch("/api/favicons/upload_favicon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl: faviconFile, domain: domain }),
    });

    if (!res.ok) {
      // Handle non-2xx responses
      const errorBody: any = await res.json();
      console.error(
        "Favicon upload failed:",
        errorBody.message || res.statusText,
      );
      return null;
    }

    const body: any = await res.json();
    return body.url || null; // Ensure we always return null if url is not present
  } catch (err) {
    console.error("Error during favicon upload:", err);
    return null;
  }
}

async function checkSiteLimit() {
  const res = await fetch("/api/orders/site-limit", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const body: any = await res.json();

  if (!res.ok) {
    console.error(body.message);
    return;
  }

  return { reachedLimit: body.reachedLimit };
}
