// Setup steps of the single gateway flow, mirrored 1:1 by the three keys of
// orders.tour:
//
//   site_selected   -> step 1 "Site"     (the account has this site connected)
//   plugin_verified -> step 2 "Plugin"   (HMAC verified against wp_key)
//   service_active  -> step 3 "Activate" (payment completed; written by the
//                                         Stripe webhook / reconcile endpoint)
//
// Progress is recorded on the `orders` row (tour jsonb + setup_step) by
// /api/orders/setup-step. The "add site" step has no server validation (the
// account simply having a site satisfies it); the plugin step is validated
// server-side against wp_key.hmac_verified_at.
//
// Site credentials are not collected here: they come later from the expert
// workspace. ActivateService gates the final step from its own card, shown in
// the stepper as a trailing pin.

export type StepKey = "site_selected" | "plugin_verified" | "service_active";

export type StepMeta = {
  /** Key that marks this step done on the orders row. */
  key: StepKey;
  title: string;
  shortTitle: string;
  description: string;
  /** Steps with no server key are satisfied client-side. */
  satisfiedBySite?: boolean;
  /**
   * What the user walks away with when this step is done. The payment card's
   * "What you will get" list renders this, so the same step reads as an
   * outcome (a benefit) before payment and as a task inside the tour.
   */
  benefit: string;
};

export const STEPS: readonly StepMeta[] = [
  {
    key: "site_selected",
    title: "Add your site",
    shortTitle: "Site",
    description: "Connect the domain you want us to look after",
    satisfiedBySite: true,
    benefit:
      "Your site performance on continuous watch. When people visits your site it will capture page performance for debugging & monitoring purpose.",
  },
  {
    // Written only after the server verified the plugin signature
    // (wp_key.hmac_verified_at), so it is what "done" means for this step.
    key: "plugin_verified",
    title:
      "Link up your site monitoring and optimization via speedy site plugin",
    shortTitle: "Plugin",
    description: "Download the plugin, activate it, then verify the connection",
    benefit:
      "A faster site, done for you optimization service based on real user experience data.",
  },
];
