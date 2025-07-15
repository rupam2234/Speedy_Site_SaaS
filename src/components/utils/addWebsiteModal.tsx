"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useClerk } from "@clerk/nextjs";

interface AddWebsiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWebsiteModal({ open, onOpenChange }: AddWebsiteModalProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { user } = useClerk();

  function extractRootDomain(value: string): string | null {
    try {
      // Add protocol if not present
      if (!/^https?:\/\//i.test(value)) {
        value = "https://" + value;
      }

      const url = new URL(value);
      const hostname = url.hostname;

      // Reject localhost, IPs, or malformed domains
      if (
        hostname === "localhost" ||
        /^[\d.]+$/.test(hostname) || // IP address
        !hostname.includes(".") ||
        hostname.endsWith(".") ||
        hostname.startsWith(".")
      ) {
        return null;
      }

      const parts = hostname.split(".").filter(Boolean);
      if (parts.length < 2) return null;

      // Return root domain (e.g. example.com from blog.example.com)
      return parts.slice(-2).join(".");
    } catch {
      return null; // Invalid URL or domain
    }
  }

  async function uploadFavicon(faviconFile: string) {
    if (!faviconFile) return;

    const res = await fetch("/api/favicons/upload_favicon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl: faviconFile }),
    });

    const body = await res.json();

    if (!body) {
      return null;
    }

    return body.url;
  }

  async function getFavicon(domain: string | null) {
    if (!domain || domain === null) {
      return;
    }

    const res = await fetch("/api/favicons/fetch_single", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ website: domain }),
    });

    const body = await res.json();

    return body.faviconData.favicon;
  }

  async function addOrder(uploadedFavicon: string, domain: string) {
    if (!uploadedFavicon || !domain) {
      return;
    }

    const res = await fetch("/api/orders/newOrder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        website_name: domain,
        website_address: `https://${domain}`,
        gsc_token: null,
        favicon_file: uploadedFavicon,
        order_status: true,
        user_email: user?.emailAddresses[0].emailAddress,
        rank: null,
        page_tracking: 0,
      }),
    });

    if (res.status == 200) {
      return await res.json();
    } else {
      return;
    }
  }

  const handleAddWebsite = async () => {
    const cleanedDomain = extractRootDomain(input.trim());

    if (cleanedDomain) {
      // get favicon
      const favicon = await getFavicon(cleanedDomain);
      const uploaded_url = await uploadFavicon(favicon);
      const res = await addOrder(uploaded_url, cleanedDomain);

      console.log(res);

      setError(null);
      setInput(""); // Optional: clear input
      onOpenChange(false);

      // TODO: Submit the `cleanedDomain` to backend or state handler
    } else {
      setError("Please enter a valid domain (e.g. example.com)");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAddWebsite}>Add Website</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
