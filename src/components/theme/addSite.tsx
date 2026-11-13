"use client";

import { useState } from "react";
import { OrderData } from "@/app/api";
import { useSupabaseUser } from "../utils/supabase/AuthProvider";

export type AddSite = {
  input: string;
  setInput: (value: string) => void;
  isProcessing: boolean;
  error: string | null;
  success: string | null;
  /** Progress lines, oldest first. */
  log: string[];
  /** Connects the typed domain and returns it, or null when it failed. */
  handleAddWebsite: () => Promise<string | null>;
};

/**
 * Domain -> favicon -> order: the "add a site" half of the setup flow.
 *
 * Extracted from the old AddNewWebsite modal (deleted with it) so the
 * onboarding page can run the same flow inline. The free tier no longer caps
 * how many sites an account connects, so there is no limit check here.
 */
export function useAddSite(): AddSite {
  const user = useSupabaseUser();
  const [input, setInput] = useState<string>("");
  const [isProcessing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  function appendLog(stage: string) {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${stage}`]);
  }

  async function handleAddWebsite(): Promise<string | null> {
    setProcessing(true);
    setError(null);
    setSuccess(null);

    appendLog("validating");
    const cleanDomain = extractRootDomain(input?.trim());

    if (!cleanDomain) {
      setError("Please enter a valid domain (e.g. example.com)");
      appendLog("error");
      setProcessing(false);
      return null;
    }

    let favicon_file: string | null = null;
    const favicon = await getFavicon(cleanDomain);

    appendLog("fetching favicon");
    if (favicon) {
      try {
        favicon_file = await uploadFavicon(favicon, cleanDomain);

        if (!favicon_file) {
          appendLog("upload failed");
        }
      } catch (err) {
        console.error(err);
      }
    }

    appendLog("creating order");
    const res = await addOrder(favicon_file, cleanDomain, user?.id);

    if (!res) {
      setError("Unexpected error occurred.");
      appendLog("error");
      setProcessing(false);
      return null;
    }

    if (res.status === 409) {
      setError(
        res.body.message ||
          res.body.error ||
          "Site already exists. Please check your site list or contact support",
      );
      appendLog("error");
      setProcessing(false);
      return null;
    }

    // Handle other errors
    if (res.status !== 200) {
      setError(res.body.error || res.body.message || "Failed to create site.");
      appendLog("error");
      setProcessing(false);
      return null;
    }

    appendLog("done");
    setSuccess(`${cleanDomain} is connected.`);
    setProcessing(false);
    return cleanDomain;
  }

  async function addOrder(
    uploadedFavicon: string | null,
    domain: string,
    userId?: string,
  ): Promise<{ status: number; body: any } | null> {
    if (!domain) return null;

    const orderData: OrderData = {
      order_status: true,
      website_address: `https://${domain}`,
      website_name: domain,
      favicon_file: uploadedFavicon,
    };

    try {
      const res = await fetch("/api/orders/newOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderData, user_id: userId }),
      });

      const body = await res.json();

      return { status: res.status, body };
    } catch (error: any) {
      return { status: 500, body: { message: error.message } };
    }
  }

  return {
    input,
    setInput,
    isProcessing,
    error,
    success,
    log,
    handleAddWebsite,
  };
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
      headers: { "Content-Type": "application/json" },
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

async function uploadFavicon(
  faviconFile: string,
  domain: string,
): Promise<string | null> {
  if (!faviconFile) return null;

  try {
    const res = await fetch("/api/favicons/upload_favicon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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