"use client";

import { WordPress_cred } from "@/app/api/helpers/dataTypes";
import { ShieldCheck, Globe, Link2 } from "lucide-react";
import React, { useState } from "react";

export type OrderFormInput = Pick<
  WordPress_cred,
  "wp_address" | "wp_login_url"
>;

const initialState: OrderFormInput = {
  wp_address: "",
  wp_login_url: "",
};

export default function ManagedServiceMetadata() {
  const [form, setForm] = useState<OrderFormInput>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [countdown, setCountdown] = useState(5);

  const handleChange =
    (field: keyof OrderFormInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const getSite = () => {
    if (!form.wp_address) return null;
    return new URL(form.wp_address).hostname;
  };

  const handleSubmit = async () => {
    const selectedSite = getSite();

    if (!selectedSite) {
      console.error("Select a site to proceed");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders/managed/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wp_address: form.wp_address,
          wp_login_url: form.wp_login_url,
          selectedSite: selectedSite,
        }),
      });

      if (!res.ok) {
        const error: any = await res.json();
        throw new Error(error.message);
      }

      setSuccessMessage("Data sent.");
      setForm({ wp_address: "", wp_login_url: "" }); // resetting the form

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            sessionStorage.removeItem("orders"); // flush order cache
            location.replace(
              `/dashboard/managed-wp/status?site=${selectedSite}`,
            );
            return 0;
          }

          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="col-span-1 order-1 space-y-5">
        <div className="space-y-2">
          <h2 className="text-primary text-sm font-medium">
            A few details to get your expert started
          </h2>
          <p className="text-primary/60 text-sm leading-relaxed">
            To work on your site and configure the cache settings appropriately,
            we need admin access via this email:{" "}
            <strong>contact@speedy.site</strong>. Please create a user account
            for this email address (or use a temporary user access plugin), then
            provide the required details below.
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-primary/10 dark:bg-secondary-background bg-green-200 px-3 py-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary/60 dark:text-green-300" />
          <p className="text-primary/80 dark:text-green-300 text-xs leading-relaxed">
            Stored encrypted. Only your assigned expert can access it, and you
            can revoke it once the order is complete.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="site-url" className="text-primary/60 text-xs">
              Site address
            </label>
            <div className="group relative">
              <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/30 transition-colors duration-200 group-focus-within:text-primary/60" />
              <input
                id="site-url"
                name="site-url"
                type="url"
                autoComplete="url"
                value={form.wp_address}
                onChange={handleChange("wp_address")}
                placeholder="https://your-wordpress-site.com"
                className="w-full min-w-100 rounded-md border border-primary/10 bg-primary/2 py-2 pl-8 pr-3 text-sm outline-0 transition-all duration-200 placeholder:text-primary/25 hover:border-primary/20 focus:border-primary/30 focus:bg-transparent focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-url" className="text-primary/60 text-xs">
              Admin login address
            </label>
            <div className="group relative">
              <Link2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/30 transition-colors duration-200 group-focus-within:text-primary/60" />
              <input
                id="admin-url"
                name="admin-url"
                type="url"
                autoComplete="url"
                value={form.wp_login_url}
                onChange={handleChange("wp_login_url")}
                placeholder="https://your-wordpress-site.com/wp-admin"
                className="w-full min-w-100 rounded-md border border-primary/10 bg-primary/2 py-2 pl-8 pr-3 text-sm outline-0 transition-all duration-200 placeholder:text-primary/25 hover:border-primary/20 focus:border-primary/30 focus:bg-transparent focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-w-100 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.99]"
          >
            {submitting ? "Submitting..." : "Send details"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {successMessage && (
            <p className="text-green-700 text-sm">
              {successMessage} You will be redirected to dashboard in{" "}
              {countdown} seconds
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
