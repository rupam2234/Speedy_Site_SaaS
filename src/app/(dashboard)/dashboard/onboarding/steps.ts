// Setup steps of the single gateway flow (add site -> install the plugin).
//
// Verifying the installation is deliberately NOT its own step: it is the tail
// of the plugin step, so the bar shows Activate -> Site -> Plugin and the setup
// is complete the moment the plugin installation is verified.
//
// Progress is recorded on the `orders` row (tour jsonb + setup_step) by
// /api/orders/setup-step. The "add site" step has no server key (the account
// simply having a site satisfies it); the plugin step records every remaining
// key in one go when verification succeeds, because the signature binding and
// the collector assignment all happen behind that single confirmation.
//
// Site credentials are not collected here: they come later from the expert
// workspace.
//
// Payment is not a step either: ActivateService gates the flow from its own
// card, shown in the stepper as a leading pin.

export type StepKey =
  | "site_selected"
  | "signature_bound"
  | "plugin_installed"
  | "signature_verified"
  | "rum_assigned";

export type StepMeta = {
  /** Key that marks this step done on the orders row. */
  key: StepKey;
  title: string;
  shortTitle: string;
  description: string;
  /** Server step indices recorded when this step completes. */
  records: readonly number[];
  /** Steps with no server key are satisfied client-side. */
  satisfiedBySite?: boolean;
};

export const STEPS: readonly StepMeta[] = [
  {
    key: "site_selected",
    title: "Add your site",
    shortTitle: "Site",
    description: "Connect the domain you want us to look after",
    records: [],
    satisfiedBySite: true,
  },
  {
    // signature_verified is the last key written, so it is what "done" means.
    key: "signature_verified",
    title: "Download, install and verify the plugin",
    shortTitle: "Plugin",
    description: "Download the plugin, activate it, then verify the connection",
    records: [1, 2, 3, 4],
  },
];