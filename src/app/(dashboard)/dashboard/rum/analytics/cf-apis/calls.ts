"use client";

interface ApiProps {
  startDate: string,
  endDate:string,
  domain: string;
  key?: string;
}

export async function overviewApi({ startDate, endDate, domain }: ApiProps) {
  const res = await fetch(
    `https://analytics-cron.thespeedysite.workers.dev/metrics?startDate=${encodeURIComponent(
      startDate
    )}&endDate=${encodeURIComponent(
      endDate
    )}&domain=${encodeURIComponent(domain)}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch metrics");
  }

  const data = await res.json();
  return data;
}

export async function countryDistributionApi({ startDate, endDate, domain }: ApiProps) {
  const res = await fetch(
    `https://analytics-cron.thespeedysite.workers.dev/country-breakdown?startDate=${encodeURIComponent(
      startDate
    )}&endDate=${encodeURIComponent(endDate)}&domain=${encodeURIComponent(domain)}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch country distribution");
  }

  const data = await res.json();
  return data;
}

export async function trafficSourceApi({ startDate, endDate, domain, key }: ApiProps) {

    if (!startDate || !endDate || !domain || !key) {
        return Response.json(
          { message: "Bad request" },
          { status: 400 }
        );
      }

  const res = await fetch(
    `https://traffic-source-cron.thespeedysite.workers.dev/get-source?startDate=${encodeURIComponent(
      startDate
    )}&endDate=${encodeURIComponent(endDate)}&domain=${encodeURIComponent(domain)}&key=${encodeURIComponent(key)}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch country distribution");
  }

  const data = await res.json();
  return data;
}
