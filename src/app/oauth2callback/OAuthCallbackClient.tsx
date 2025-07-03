"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TokenProps } from "../api/orders/updateOrder/route";

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const [sites, setSites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setError("Missing authorization code");
      setLoading(false);
      return;
    }

    async function exchangeCode() {
      try {
        const res = await fetch("/api/auth/handle-oauth-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          throw new Error("Failed to exchange code");
        }

        const data = await res.json();
        setSites(data?.sites || []);
        setToken(data?.accessToken || "");
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    exchangeCode();
  }, [searchParams]);

  const handleSiteSelect = async (site: string) => {
    setError(null); // clear any previous error

    if (!window.opener) {
      setError("No parent window found");
      return;
    }

    let url: string = "";

    if (site.startsWith("http") && site.match("/")) {
      url = new URL("https://speedy.site/").hostname;
    } else if (site.startsWith("sc-domain:")) {
      url = site.split(":")[1];
    }

    // get site from session storage
    const selectedSite = localStorage.getItem("selectedSite");
    const gsc_token = localStorage.getItem("gsc_t");

    if (selectedSite && url === selectedSite) {
      try {
        // if the url matches the seleted site we look for token on order, and if token is not available or does not match we update the token
        if (selectedSite && gsc_token !== token) {
          UpdateToken(token);
        }

        const fetchedPages = await FetchPageAddresses(site, token);
        window.opener.postMessage(
          {
            status: "site_selected",
            pages: fetchedPages,
          },
          window.location.origin
        );
        localStorage.removeItem("selectedSite"); // clear site from session storage
        window.close();
      } catch (err) {
        setError(`Failed to fetch pages for the selected site: ${err}`);
      }
    } else {
      setError(
        `Please select the Google Search Console site that matches the site [${selectedSite}] you're currently viewing on SpeedySense.`
      );
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center text-sm p-4 max-w-md text-center space-y-4">
        {loading && <p>Connecting to Google Search Console...</p>}
        {error && (
          <p className="text-amber-600 font-medium text-center max-w-sm">
            {error}
          </p>
        )}

        {!loading && sites.length > 0 && (
          <div className="w-full">
            <p className="mb-2">Select a site to grant access:</p>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {value
                    ? sites.find((site) => site === value)
                    : "Select site..."}
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search sites..." />
                  <CommandList>
                    <CommandEmpty>No site found.</CommandEmpty>
                    <CommandGroup>
                      {sites.map((site) => (
                        <CommandItem
                          key={site}
                          value={site}
                          onSelect={(currentValue) => {
                            setValue(currentValue);
                            setOpen(false);
                            handleSiteSelect(currentValue);
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === site ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {site}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {!loading && !error && sites.length === 0 && (
          <p>No sites found in your Search Console account.</p>
        )}
      </div>
    </div>
  );
}

async function FetchPageAddresses(domain: string, token: string) {
  if (!domain || !token) {
    console.error("Missing domain or access token!");
    return;
  }

  try {
    const res = await fetch("/api/auth/search-console-pages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ domain, accessToken: token }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to fetch pages");
    }

    const data = await res.json();
    return data.pages;
  } catch (err) {
    console.error("Error fetching GSC pages:", err);
    throw err;
  }
}

async function UpdateToken(token: string) {
  const userEmail = localStorage.getItem("userEmail");

  if (!token || !userEmail) {
    console.error("Missing website or token");
    return;
  }

  const body: TokenProps = { token: token, userEmail: userEmail };

  try {
    const response = await fetch("/api/orders/updateOrder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(response.statusText);
    }
  } catch (error) {
    console.error(error);
  }
}
