interface ApiProps {
  time_range:
    | "yesterday"
    | "last7days"
    | "30days"
    | "thisMonth"
    | "lastMonth"
    | "last6Months"
    | "year"
    | "today"
    | "thisYear";
  domain: string;
}

export async function overviewApi({ time_range, domain }: ApiProps) {
  const res = await fetch(
    `https://analytics-cron.thespeedysite.workers.dev/metrics?range=${encodeURIComponent(
      time_range
    )}&domain=${encodeURIComponent(domain)}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch metrics");
  }

  const data = await res.json();
  return data;
}

export async function countryDistribution({ time_range, domain }: ApiProps) {
  const res = await fetch(
    `https://analytics-cron.thespeedysite.workers.dev/country-breakdown?range=${encodeURIComponent(
      time_range
    )}&domain=${encodeURIComponent(domain)}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch country distribution");
  }

  const data = await res.json();
  return data;
}
