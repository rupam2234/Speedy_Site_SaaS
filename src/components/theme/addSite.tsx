"use client";

import { OrderData } from "@/app/api/dataTypes";
import { useEffect, useState } from "react";
import { useSupabaseUser } from "../utils/supabase/AuthProvider";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  useEffect(() => {
    if (!success) return;

    const redirect = setTimeout(() => {
      setDisplay({ display: false });
      window.location.reload();
    }, 5000);

    return () => clearTimeout(redirect);
  }, [success, router]);

  return (
    <>
      <div className="fixed top-1/2 left-1/2 z-19990 w-9/10 h-auto md:w-200 md:h-auto px-4 py-10 border-2 border-primary/20 bg-white dark:bg-secondary-background dark:border-2 dark:border-white/50 shadow-lg rounded-md transform -translate-x-1/2 -translate-y-1/2">
        <div
          className="absolute top-3 right-3 hover:bg-primary/5 rounded-full cursor-pointer px-2 py-0.5 text-sm"
          onClick={() => setDisplay({ display: false })}
        >
          X
        </div>
        <h3>Add a new website</h3>
        <p className="text-sm text-primary/60">
          Enter the primary domain you want to track to enable UX and
          performance and experience monitoring.
        </p>

        <form
          className="add-website-form mt-5 flex gap-2 items-center"
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
            className="border-2 border-primary/30 rounded-sm text-primary outline-none px-2 py-0.5 text-sm w-2/5"
            disabled={isProcessing}
          />
          <button
            className="bg-green-300 border-2 rounded-sm text-sm px-2 py-0.5 cursor-pointe text-primary dark:text-primary-foreground hover:bg-green-500"
            disabled={isProcessing}
          >
            Add site
          </button>
        </form>

        {error ? (
          <p className="h-1.5 text-red-500 font-medium mt-0.5 text-xs">
            {error}
          </p>
        ) : (
          <p className="h-1.5"></p>
        )}

        <div className="mt-5">
          <h4 className="font-medium text-primary/80">Progress:</h4>
          <pre
            className="text-black dark:text-amber-300"
            id="log"
            style={{
              padding: "6px",
              fontFamily: "monospace",
              fontSize: 12,
              width: "100%",
              height: "150px",
              marginTop: "10px",
              overflowY: "scroll",
              border: "2px solid #cfd1d5",
              borderRadius: "4px",
            }}
          />
        </div>

        {success !== null ? (
          <p className="text-sm mt-2 text-green-500 font-medium capitalize">
            {success}{" "}
            <span className="text-primary/80">refreshing the page...</span>
          </p>
        ) : (
          <p></p>
        )}
        <p></p>
      </div>
    </>
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
