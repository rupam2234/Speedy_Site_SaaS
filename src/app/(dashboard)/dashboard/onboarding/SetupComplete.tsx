type SetupCompleteProps = {
  onGoToDashboard: () => void;
  onAddAnotherSite: () => void;
};

/** Shown once the plan flipped to "Managed WP", i.e. the tour is finished. */
export function SetupComplete({
  onGoToDashboard,
  onAddAnotherSite,
}: SetupCompleteProps) {
  return (
    <div className="w-full">
      <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-sm p-8 text-center space-y-3">
        <h1 className="text-xl font-bold text-primary">Setup complete</h1>
        <p className="text-sm text-primary/70 max-w-xl mx-auto">
          Your managed WordPress performance service is active. The plugin
          injects the real-user collector automatically, and data appears in the
          dashboard within its 5-minute cache window.
        </p>
        <button
          onClick={onGoToDashboard}
          className="mt-2 bg-primary cursor-pointer hover:bg-secondary-background/60 text-primary-foreground text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded-sm hover:opacity-90 transition-opacity"
        >
          Go to the dashboard
        </button>

        {/* TODO (Co-developer handover per ADR-0002): Add primary CTA button
            "Message Your Assigned Expert" linking to /dashboard/managed-wp/status?site=<site> */}

        {/* Adding a site runs the same integration flow */}
        <button
          onClick={onAddAnotherSite}
          className="mt-2 block cursor-pointer text-xs font-medium text-primary/60 underline underline-offset-4 transition-colors hover:text-primary"
        >
          Connect another site
        </button>
      </div>
    </div>
  );
}
