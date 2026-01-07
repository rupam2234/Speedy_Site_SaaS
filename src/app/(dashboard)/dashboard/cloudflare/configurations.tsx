"use client";

import TooltipIcon from "@/components/utils/customTooltip";
import { InfoIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import EditCacheRule from "./cacheHtml";
import { toast } from "sonner";

interface Props {
  site: string;
  cachekey: string;
}

export type CacheRule = {
  action: "set_cache_settings";
  action_parameters: {
    browser_ttl: {
      default?: number;
      mode: "respect_origin" | "override_origin" | "bypass";
    };
    cache: boolean;
    edge_ttl: {
      default: number;
      mode: "override_origin" | "respect_origin";
    };
    origin_error_page_passthru: boolean;
    serve_stale: {
      disable_stale_while_updating: boolean;
    };
  };
  description: string;
  enabled: boolean;
  expression: string;
  id: string;
  last_updated: string; // ISO 8601 timestamp
  ref: string;
  version: string;
}; // based on cloudflare incoming data

export default function CloudflareConfigurations({ site, cachekey }: Props) {
  const [cf_configs, setCfConfigs] = useState<CacheRule[]>();
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<CacheRule[]>([]);

  // handles fetching cache rules from cloudflare
  useEffect(() => {
    getRules();
  }, [site]);

  // handles mouse click outside the dotted menu per rule row
  useEffect(() => {
    const handleDottedMenuClick = () => setOpenRowId(null);
    document.addEventListener("click", handleDottedMenuClick);
    return () => document.removeEventListener("click", handleDottedMenuClick);
  }, [openRowId]);

  return (
    <>
      {cf_configs === undefined ? (
        // skeleton
        <div className="space-y-3">
          <div className="border border-primary/30 rounded-md overflow-auto">
            <table className="w-full text-left text-sm [&_th]:px-4 [&_th]:font-medium [&_th]:py-3">
              <thead className="bg-primary/5 w-full">
                <tr className="border-b border-primary/20">
                  <th className="w-10">
                    <button className="py-1 cursor-pointer">
                      <PlusIcon size={16} />
                    </button>
                  </th>
                  <th>Rules</th>
                  <th>Updated on</th>
                  <th>Edge TTL</th>
                  <th>Browser TTL</th>
                  <th>Status</th>
                  <th className="w-10 py-3"></th>
                </tr>
              </thead>
              <tbody className="animate-pulse bg-primary/5">
                <tr className="border-b last:border-b-0 border-primary/20">
                  <td className="px-4 py-4">
                    <div className="h-4 w-4 rounded bg-primary/20" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-28 rounded bg-primary/20" />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-24 rounded bg-primary/20" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-5 w-24 rounded bg-primary/20" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-12 rounded bg-primary/20" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-12 rounded bg-primary/20" />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="ml-auto h-4 w-4 rounded bg-primary/20" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // main data
        <div className="space-y-3">
          <div className="border border-primary/30 rounded-md overflow-auto">
            <table className="w-full text-left text-sm [&_th]:px-4 [&_th]:font-medium [&_th]:py-3">
              <thead className="bg-primary/5 w-full">
                <tr className="border-b border-primary/20">
                  <th className="w-10">
                    <button className="py-1 cursor-pointer">
                      <PlusIcon size={16} />
                    </button>
                  </th>
                  <th>Rules</th>
                  <th>Updated on</th>
                  <th>
                    <TooltipIcon
                      trigger={
                        <span className="flex gap-2 items-center">
                          Edge TTL{" "}
                          <InfoIcon size={14} className="text-primary/80" />
                        </span>
                      }
                      side="left"
                      maxWidth="500px"
                      content="Edge TTL refers to how long resources are cached at servers closest to the users. A balance between cache time and your content update is ideal."
                    />
                  </th>
                  <th>
                    <TooltipIcon
                      trigger={
                        <span className="flex gap-2 items-center">
                          Browser TTL{" "}
                          <InfoIcon size={14} className="text-primary/80" />
                        </span>
                      }
                      side="left"
                      maxWidth="500px"
                      content="Browser TTL is how long the visitor’s browser caches your resources before it asks Cloudflare for a fresh copy."
                    />
                  </th>
                  <th>Status</th>
                  <th className="w-10 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {cf_configs &&
                  cf_configs.map((x) => (
                    <tr
                      className="border-b last:border-b-0 border-primary/20"
                      key={x.id}
                    >
                      <td className="px-[18px] py-4">
                        <input
                          type="checkbox"
                          className="h-3 w-3 rounded border-primary/40"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span>{x.description}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {x.last_updated.split("T")[0]}
                      </td>
                      <td className="px-4 py-4">
                        <span>
                          {x.action_parameters.edge_ttl.mode
                            .replace("_", " ")
                            .replace(/^\w/, (c) => c.toUpperCase())}{" "}
                          / {x.action_parameters.edge_ttl.default / 3600} Hours
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {x.action_parameters.browser_ttl.mode
                          .replace("_", " ")
                          .replace(/^\w/, (c) => c.toUpperCase())}{" "}
                        {x.action_parameters.browser_ttl.mode ===
                        "override_origin"
                          ? `/ ${
                              x.action_parameters.browser_ttl?.default! / 3600
                            } Hours`
                          : ""}
                      </td>
                      <td className="px-4 py-4 font-medium">
                        {x.enabled ? (
                          <span className="text-green-500">Enabled</span>
                        ) : (
                          <span className="text-orange-500">Disabled</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          className="text-primary/80 hover:bg-primary/20 w-6 rounded-sm p-[2px] cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation(); // to prevent immediate closure
                            setOpenRowId(openRowId === x.id ? null : x.id);
                            selectData(x.id);
                          }}
                        >
                          ⋮
                        </button>

                        {openRowId === x.id && (
                          <div className="absolute right-9 mt-2 w-32 border [&_li]:dark:hover:bg-primary/20 [&_li]:hover:bg-primary/20 bg-primary-foreground dark:bg-secondary-background shadow-lg z-10">
                            <ul className="text-sm text-primary/80">
                              <li
                                className="px-4 py-2 cursor-pointer"
                                onClick={() =>
                                  setEditRowId(editRowId === x.id ? null : x.id)
                                }
                              >
                                Edit
                              </li>
                              <li
                                className="px-4 py-2 cursor-pointer"
                                onClick={toggleRule}
                              >
                                {cf_configs[0].enabled ? "Disable" : "Enable"}
                              </li>
                              <li
                                className="px-4 py-2 cursor-pointer bg-red-400 text-primary-foreground"
                                onClick={() => deleteRule(selectedData[0].id)}
                              >
                                Delete
                              </li>
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {editRowId !== null && (
              <div className="p-6 text-primary/80 space-y-3 w-4/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 shadow-md md:w-auto md:h-auto bg-primary-foreground dark:bg-secondary-background border border-primary/10 rounded-md">
                <EditCacheRule
                  data={selectedData ? selectedData : []}
                  cacheKey={cachekey}
                  close={handleModalClose}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  async function getRules() {
    if (!site) return;

    const TTL = 10 * 60 * 1000; // 10 min
    const cached = localStorage.getItem(cachekey);

    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < TTL) {
        setCfConfigs(data);
        return;
      }
    }

    const rules = await fetch("/api/cloudflare/zones/get-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site: site }),
    });

    if (!rules.ok) {
      console.log("Failed to fetch rules: ", rules.statusText);
      return;
    }

    const result: any = await rules.json();
    const data = result ? result.rulesetData?.result.rules : [];

    localStorage.setItem(
      cachekey,
      JSON.stringify({ data, timestamp: Date.now() }),
    );

    // then we will set the data
    setCfConfigs(data);
  }

  // handles selected rule row decisions
  function selectData(rowId: string) {
    if (cf_configs && rowId) {
      setSelectedData(cf_configs.filter((x) => x.id === rowId));
    } else {
      setSelectedData([]);
    }
  }

  // enables / disbales cache rule
  async function toggleRule() {
    const res = await fetch("/api/cloudflare/zones/toggle-rule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site: site,
        rule_id: selectedData[0].id,
        isEnabled: selectedData[0].enabled,
      }),
    });

    if (!res.ok) {
      toast.error(
        `Failed to ${selectedData[0].enabled ? "Disable" : "Enable"} cache rule`,
        {
          style: { backgroundColor: "red", color: "white" },
        },
      );
      return;
    }

    // after update we need to clear the cache :D
    localStorage.removeItem(cachekey);

    toast.success(`Rule ${selectedData[0].enabled ? "Disabled" : "Enabled"}`);
  }

  // to delele the selected cache rule
  async function deleteRule(ruleId: string) {
    const res = await fetch("/api/cloudflare/zones/delete-rule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rule_id: ruleId, site: site }),
    });

    if (!res.ok) {
      console.error("Unable to delete cache rule");
      toast.error("Couldn't delete your cache rule", {
        style: { backgroundColor: "red", color: "white" },
      });
      return;
    }

    toast.success("Cache rule deleted");
  }

  function handleModalClose() {
    setEditRowId(null);
  }
}
