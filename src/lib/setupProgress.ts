export type SetupOrder = {
  order_status?: boolean | null;
  tour?: unknown;
};

/**
 * Returns recorded setup progress. The site step comes from the order row,
 * while plugin and service steps come from the tour and payment state.
 */
export function getSetupProgress(order: SetupOrder | null | undefined) {
  const tour = (order?.tour ?? {}) as Record<string, unknown>;

  return {
    siteConnected: Boolean(order),
    pluginVerified: tour.plugin_verified === true,
    serviceActive:
      tour.service_active === true || order?.order_status === true,
  };
}

/** True only when every onboarding step has been completed for the site. */
export function isSetupComplete(order: SetupOrder | null | undefined) {
  const progress = getSetupProgress(order);
  return (
    progress.siteConnected &&
    progress.pluginVerified &&
    progress.serviceActive
  );
}
