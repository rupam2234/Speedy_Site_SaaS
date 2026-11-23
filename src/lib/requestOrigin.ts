function parseHttpOrigin(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Resolves the public origin of the environment that initiated a request.
 * The forwarded host is checked before request.url for deployments behind a proxy.
 */
export function getRequestOrigin(request: Request): string | null {
  const origin = parseHttpOrigin(request.headers.get("origin"));
  if (origin) return origin;

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  if (forwardedHost) {
    const forwardedOrigin = parseHttpOrigin(
      `${forwardedProto || "https"}://${forwardedHost}`,
    );
    if (forwardedOrigin) return forwardedOrigin;
  }

  return parseHttpOrigin(request.url);
}
