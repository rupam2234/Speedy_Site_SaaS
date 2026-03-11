"use client";

import { OrderData } from "@/app/api/dataTypes";
import { useEffect, useState } from "react";
import { useSupabaseUser } from "../utils/supabase/AuthProvider";
import { cachedData } from "../utils";

interface Props {
  setDisplay: ({ display }: { display: boolean }) => void;
}

type Steps =
  | "idle"
  | "validating"
  | "fetching favicon"
  | "uploading favicon"
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

  useEffect(() => {
    if (!success) return;

    const redirect = setTimeout(() => {
      setDisplay({ display: false });
      window.location.reload();
    }, 5000);

    return () => clearTimeout(redirect);
  }, [success, setDisplay]);

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
              className="bg-green-300 border border-[#141414] px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-green-500 transition-all"
            >
              Add Site
            </button>
          </form>

          {error && (
            <p className="text-red-500 font-medium text-xs mb-4">{error}</p>
          )}

          <div className="mt-6">
            <h4 className="font-bold uppercase text-xs mb-2 text-primary/80">
              Progress
            </h4>

            <pre
              id="log"
              className="text-black dark:text-amber-300 bg-gray-50 p-4 border border-[#141414]/20 rounded-sm text-xs font-mono h-40 overflow-y-auto"
            />
          </div>

          {success !== null && (
            <p className="text-sm mt-4 text-green-500 font-medium capitalize">
              {success}
              <span className="text-primary/80 ml-2">
                refreshing the page...
              </span>
            </p>
          )}
        </div>

        <div className="p-6 border-t border-[#141414] flex justify-end">
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
      return;
    }
    //

    appendLog("validating");
    const cleanDomain = extractRootDomain(input?.trim());

    if (!cleanDomain) {
      setError("Please enter a valid domain (e.g., example.com)");
      appendLog("error");
      setProcessing(false);
      return;
    }

    let favicon_file = null;
    appendLog("fetching favicon");
    const favicon = await getFavicon(cleanDomain);

    appendLog("uploading favicon");
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

    if (res.status !== 200) {
      appendLog("error");
      console.log(res.body);
      setError(res.body.message);
      setProcessing(false);
      return;
    }

    appendLog("done");
    setSuccess("Website configured.");
    setProcessing(false);
  }

  async function addOrder(
    uploadedFavicon: string | null,
    domain: string,
  ): Promise<any | null> {
    if (!domain) {
      return;
    }

    const orderData: OrderData = {
      order_status: true,
      website_address: `https://${domain}`,
      website_name: domain,
      favicon_file: uploadedFavicon,
    };

    const key = `orders`;

    const { response } = await cachedData({
      fn: fetchNewOrders,
      session_Storage: true,
      ttl: 5 * 60 * 1000,
      key: key,
    });

    async function fetchNewOrders() {
      const res = await fetch("/api/orders/newOrder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderData: orderData, user_id: user?.id }),
      });

      const body: any = await res.json();

      if (!res.ok) {
        throw new Error(body.message);
      }

      sessionStorage.removeItem("orders");
      sessionStorage.removeItem("orders-ts");

      return { status: res.status, body: body };
    }

    return response;
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
