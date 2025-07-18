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

interface AddWebsiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWebsiteModal({ open, onOpenChange }: AddWebsiteModalProps) {
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
        /^[\d.]+$/.test(hostname) ||
        !hostname.includes(".") ||
        hostname.endsWith(".") ||
        hostname.startsWith(".")
      ) {
        return null;
      }
      const parts = hostname.split(".").filter(Boolean);
      if (parts.length < 2) return null;
      return parts.slice(-2).join(".");
    } catch {
      return null;
    }
  }

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
    uploadedFavicon: string,
    domain: string
  ): Promise<any | null> {
    if (!uploadedFavicon || !domain) {
      return null;
    }

    const now = new Date();
    const billingCycleEnd = new Date();
    billingCycleEnd.setDate(now.getDate() + 30);

    const orderData: OrderData = {
      order_status: true,
      user_email:
        user?.emailAddresses[0]?.emailAddress ?? "email_undefined@gmail.com",
      website_address: `https://${domain}`,
      website_name: domain,
      gsc_token: null,
      favicon_file: uploadedFavicon,
      has_lab_access: false,
      has_rum_access: false,
      subscription_started_at: now.toISOString(),
      billing_cycle_start: now.toISOString(),
      billing_cycle_end: billingCycleEnd.toISOString(),
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
      } else {
        // Log error from backend if available
        const errorBody = await res.json();
        console.error(
          "Failed to add order:",
          errorBody.message || res.statusText
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
      const favicon = await getFavicon(cleanedDomain);
      if (!favicon) {
        setError(
          "Could not fetch favicon for the provided domain. Please check the domain or try again."
        );
        setIsProcessing(false);
        return;
      }

      // 2. Upload Favicon
      const uploaded_url = await uploadFavicon(favicon);
      if (!uploaded_url) {
        setError("Failed to upload favicon. Please try again.");
        setIsProcessing(false);
        return;
      }

      // 3. Add Order
      const res = await addOrder(uploaded_url, cleanedDomain);
      if (!res) {
        setError("Failed to add website order. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Success
      setError(null);
      setInput(""); // Clear input
      onOpenChange(false); // Close modal
      // Optionally, trigger a refresh or show a success toast here
      alert("Website added successfully!"); // Simple alert for now
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Add a New Website
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Enter the primary domain you want to track. This enables performance
            and experience monitoring across your site.{" "}
            <span className="text-red-500">
              If you&apos;d like to track subdomains, you can add specific pages
              from those subdomains later.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="website">Website domain</Label>
            <Input
              id="website"
              placeholder="e.g. https://blog.example.com"
              autoFocus
              className="text-base"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing} // Disable input while processing
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isProcessing}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleAddWebsite} disabled={isProcessing}>
            {isProcessing ? "Adding..." : "Add Website"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
