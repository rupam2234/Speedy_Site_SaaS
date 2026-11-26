import { setupDB } from "@/lib/db";
import {
  buildDeviceIssues,
  limitIssuesByMetric,
  type ClsIssueRow,
  type DeviceIssue,
  type DeviceKey,
  type InpIssueRow,
  type LcpDeviceRollupRow,
  type LcpIssueRow,
  type TtfbIssueRow,
} from "@/lib/rum/deviceIssues";

const worker = setupDB();

export type DeviceIssueGroups = Record<DeviceKey, DeviceIssue[]>;

export class DeviceIssueQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeviceIssueQueryError";
  }
}

/**
 * Reads the retained LCP, CLS, INP, and TTFB readers in one parallel query and
 * returns the per device issue groups used by the panels and the assistant.
 */
export async function readDeviceIssueGroups(
  domainName: string,
): Promise<DeviceIssueGroups> {
  const [lcpResult, clsResult, inpResult, ttfbResult, rollupResult] =
    await Promise.all([
      worker.rpc("analyze_lcp_by_device", { domain_filter: domainName }),
      worker.rpc("cls_elements", { p_domain_name: domainName }),
      worker.rpc("inp_elements", { p_domain_name: domainName }),
      worker.rpc("ttfb_contributors", { p_domain: domainName }),
      worker.rpc("analyze_lcp_device_rollup", { domain_filter: domainName }),
    ]);

  const failures = [lcpResult, clsResult, inpResult, ttfbResult].filter(
    (result) => result.error,
  );
  if (failures.length > 0) {
    throw new DeviceIssueQueryError(
      failures[0].error?.message ?? "Device issue readers failed.",
    );
  }

  // The device rollup is an additive reader, a failure must not hide the
  // element level issues that are already available.
  const rollupRows = rollupResult.error
    ? []
    : ((rollupResult.data ?? []) as LcpDeviceRollupRow[]);

  const grouped = buildDeviceIssues({
    lcp: (lcpResult.data ?? []) as LcpIssueRow[],
    cls: (clsResult.data ?? []) as ClsIssueRow[],
    inp: (inpResult.data ?? []) as InpIssueRow[],
    ttfb: (ttfbResult.data ?? []) as TtfbIssueRow[],
    lcpRollup: rollupRows,
  });

  return {
    desktop: limitIssuesByMetric(grouped.desktop),
    mobile: limitIssuesByMetric(grouped.mobile),
    tablet: limitIssuesByMetric(grouped.tablet),
  };
}
