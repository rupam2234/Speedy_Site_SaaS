export function PlanUpgradeFallback() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center px-6">
      <div className="max-w-sm p-6 rounded-lg border border-primary/20 bg-primary-foreground dark:bg-secondary-background flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-primary">Upgrade Required</h2>
        <p className="text-sm text-primary/80">
          This feature requires a{" "}
          <span className="font-medium">higher plan</span>. Unlock advanced
          plugin analysis and more by upgrading.
        </p>
        <button
          className="mt-2 cursor-pointer w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          onClick={() => (window.location.href = "/account/subscription")}
        >
          Upgrade Now
        </button>
      </div>
    </div>
  );
}
