// "use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
// Ensure this path is correct for your OrderData interface
import { OrderData } from "@/app/api/dataTypes";
import { LoaderIcon } from "lucide-react";

interface AddWebsiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddWebsiteModal({
  open,
  onOpenChange,
  onSuccess,
}: AddWebsiteModalProps) {
  const { user } = useClerk();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // To disable button during async operations

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

      return hostname; // Keeps 'www' and subdomains
    } catch {
      return null;
    }
  }

  //#region Upload favicon to db
  async function uploadFavicon(faviconFile: string): Promise<string | null> {
    if (!faviconFile) return null;

    try {
      const res = await fetch("/api/favicons/upload_favicon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl: faviconFile }),
      });

      if (!res.ok) {
        // Handle non-2xx responses
        const errorBody = await res.json();
        console.error(
          "Favicon upload failed:",
          errorBody.message || res.statusText
        );
        return null;
      }

      const body = await res.json();
      return body.url || null; // Ensure we always return null if url is not present
    } catch (err) {
      console.error("Error during favicon upload:", err);
      return null;
    }
  }
  //#endregion

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
        const errorBody = await res.json();
        console.error(
          "Favicon fetch failed:",
          errorBody.message || res.statusText
        );
        return null;
      }

      const body = await res.json();
      // Safely access nested property
      return body.faviconData?.favicon || null;
    } catch (err) {
      console.error("Error during favicon fetch:", err);
      return null;
    }
  }

  async function addOrder(
    uploadedFavicon: string | null,
    domain: string
  ): Promise<any | null> {
    if (!domain) {
      return;
    }

    const orderData: OrderData = {
      order_status: true,
      user_email: user?.emailAddresses[0]?.emailAddress ?? "",
      website_address: `https://${domain}`,
      website_name: domain,
      gsc_token: null,
      favicon_file: uploadedFavicon,
    };

    try {
      const res = await fetch("/api/orders/newOrder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (res.status === 200) {
        return await res.json();
      } else if (res.status === 502) {
        // if max site limit reached
        return { success: false, status: res.status };
      } else {
        // Log error from backend if available
        const errorBody = await res.json();
        console.error(
          "Failed to add order:",
          errorBody.details || res.statusText
        );
        return null;
      }
    } catch (err) {
      console.error("Error during addOrder:", err);
      return null;
    }
  }

  const handleAddWebsite = async () => {
    setIsProcessing(true);
    setError(null);

    const cleanedDomain = extractRootDomain(input.trim());

    if (!cleanedDomain) {
      setError("Please enter a valid domain (e.g., example.com)");
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Get Favicon
      let uploaded_url = null;
      const favicon = await getFavicon(cleanedDomain);

      if (favicon) {
        try {
          uploaded_url = await uploadFavicon(favicon);
          if (!uploaded_url) {
            console.warn("Favicon upload failed. Proceeding without it.");
          }
        } catch (uploadErr) {
          console.warn("Upload error, skipping favicon:", uploadErr);
        }
      } else {
        console.warn("No favicon found. Proceeding without it.");
      }

      // 2. Add Order (with or without favicon)
      const res = await addOrder(uploaded_url, cleanedDomain);
      if (!res) {
        setError("Failed to add website order. Please try again.");
        return;
      } else if (res.status === 502) {
        setError("Max site limit reached");
        return;
      }

      // 3. Success
      setError(null);
      setInput("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error in handleAddWebsite:", err);
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to reset all states when modal is closed (e.g., by clicking outside or cancel)
  const handleOpenChange = (newOpenState: boolean) => {
    if (!newOpenState) {
      // If modal is being closed, reset all states
      setInput("");
      setError(null);
      setIsProcessing(false);
    }
    onOpenChange(newOpenState);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl p-8 rounded-lg shadow-xl border border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-800">
            Add a New Website
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 leading-relaxed mt-2">
            Enter the primary domain you want to track. This enables performance
            and experience monitoring across your site.{" "}
            <span className="text-orange-500 font-medium">
              If you’d like to track subdomains, you can add specific pages
              later.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-6">
          <div className="grid gap-2">
            <Label
              htmlFor="website"
              className="text-base font-medium text-gray-700"
            >
              Website Domain
            </Label>
            <Input
              id="website"
              placeholder="e.g. https://blog.example.com"
              autoFocus
              className="text-base px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing}
            />
            {error && (
              <p className="text-sm text-red-400 mt-1 font-medium">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4 space-x-2">
          <DialogClose asChild>
            <Button
              variant="outline"
              disabled={isProcessing}
              className="min-w-[120px] cursor-pointer"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleAddWebsite}
            disabled={isProcessing}
            className="min-w-[140px] cursor-pointer"
          >
            {isProcessing ? (
              <LoaderIcon className="animate-spin w-5 h-5" />
            ) : (
              "Add Website"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
