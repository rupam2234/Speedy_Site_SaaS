// Mirrors normalizeDomain in cloudflare-workers/site-metadata so the injector
// and the ingestion gate resolve the same registrable label for a host.
export function normalizeDomain(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/^www\./, "");
}
