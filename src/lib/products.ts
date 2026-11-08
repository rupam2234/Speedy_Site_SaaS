/**
 * Product catalog — $299 one-time per site, never recurring (docs/GOALS.md).
 *
 * `STRIPE_PRICE` is the name used in existing environments; the product-specific
 * `STRIPE_PRICE_MANAGED_WP` is preferred when both are present, so a rename can
 * roll out without breaking checkout anywhere.
 */
export const MANAGED_WP_PRICE_ID =
  process.env.STRIPE_PRICE_MANAGED_WP ?? process.env.STRIPE_PRICE ?? "";

export const MANAGED_WP_PRODUCT_TYPE = "managed_wp" as const;
