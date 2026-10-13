"use client";

interface ApiProps {
  startDate: string,
  endDate:string,
  domain: string;
}

export async function overviewApi({ startDate, endDate, domain }: ApiProps) {
  const res = await fetch(
    `/api/rum/analytics/overview?startDate=${encodeURIComponent(
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
    `/api/rum/analytics/country-breakdown?startDate=${encodeURIComponent(
      startDate
    )}&endDate=${encodeURIComponent(endDate)}&domain=${encodeURIComponent(domain)}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch country distribution");
  }

  const data = await res.json();
  return data;
}

export async function trafficSourceApi({ startDate, endDate, domain }: ApiProps) {
  if (!startDate || !endDate || !domain) {
    throw new Error("startDate, endDate and domain are required");
  }

  const res = await fetch(
    `/api/rum/analytics/traffic-source?startDate=${encodeURIComponent(
      startDate
    )}&endDate=${encodeURIComponent(endDate)}&domain=${encodeURIComponent(domain)}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch traffic sources");
  }

  const data = await res.json();
  return data;
}

