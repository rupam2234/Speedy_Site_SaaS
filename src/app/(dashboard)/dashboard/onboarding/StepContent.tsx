import { Check, FileArchive, LoaderCircle, Lock } from "lucide-react";
import type { OrderData } from "@/app/api";
import { Button } from "@/components/ui/button";
import { RUM_SCRIPT_URL } from "@/lib/wordpress/injection";
import { cn } from "@/lib/utils";
import { StepCard } from "./StepCard";
import { STEPS } from "./steps";
import type { PluginStatus } from "./useOnboardingTour";

const CTA_CLASS =
  "h-9 rounded-sm px-4 text-xs font-bold uppercase tracking-wide";

type StepContentProps = {
  index: number;
  site: string;
  plugin: PluginStatus;
  /** True once this session has asked the site about the plugin. */
  hasProbed: boolean;
  /** True while we keep re-checking after the user confirmed the install. */
  polling: boolean;
  busy: string | null;
  orders: OrderData[] | null;
  // "add your site"
  siteInput: string;
  setSiteInput: (value: string) => void;
  addingSite: boolean;
  addSiteError: string | null;
  addSiteSuccess: string | null;
  addSiteLog: string[];
  onCreateSite: () => void;
  // later steps
  onDownloadPlugin: () => void;
  onCheckPlugin: () => void;
  onConfirmPluginInstalled: () => void;
  onVerifyInstallation: () => void;
  onSelectSite: (site: string) => void;
};

/** Live plugin status shared by the plugin and the verify step. */
function PluginStatusRow({
  site,
  plugin,
  hasProbed,
  polling,
}: {
  site: string;
  plugin: PluginStatus;
  hasProbed: boolean;
  polling: boolean;
}) {
  if (!hasProbed) {
    return (
      <p className="text-xs text-primary/50">
        We have not looked at {site} yet - that starts when you confirm the
        plugin is active.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {plugin.loading ? (
        <>
          <LoaderCircle className="size-3.5 animate-spin text-primary/50" />
          <span className="text-primary/60">Checking {site}...</span>
        </>
      ) : plugin.installed ? (
        <span className="font-medium text-emerald-600">
          Plugin is live on {site}
        </span>
      ) : polling ? (
        <>
          <LoaderCircle className="size-3.5 animate-spin text-primary/50" />
          <span className="text-primary/60">
            Not visible yet, re-checking every 8s
          </span>
        </>
      ) : (
        <span className="text-amber-600">No plugin detected on {site} yet</span>
      )}
    </div>
  );
}

/** The two facts the plugin status answers: installed, and keyed. */
function PluginStatusPills({
  plugin,
  hasProbed,
}: {
  plugin: PluginStatus;
  hasProbed: boolean;
}) {
  // Before the first check we have no idea, so say nothing rather than "not
  // detected", which would read as a failure.
  if (!hasProbed) return null;

  return (
    <div className="flex items-center gap-4 text-xs">
      <span
        className={cn(
          "flex items-center gap-1",
          plugin.installed ? "text-emerald-600" : "text-primary/50",
        )}
      >
        {plugin.installed ? (
          <Check className="size-3.5" />
        ) : (
          <FileArchive className="size-3.5" />
        )}
        Plugin {plugin.installed ? "installed" : "not detected"}
      </span>
      <span
        className={cn(
          "flex items-center gap-1",
          plugin.keyed ? "text-emerald-600" : "text-primary/50",
        )}
      >
        <Lock className="size-3.5" />
        Access key {plugin.keyed ? "assigned" : "missing"}
      </span>
    </div>
  );
}

/** Domain form + progress log of the add-site flow. */
function AddSiteStep({
  site,
  orders,
  siteInput,
  setSiteInput,
  addingSite,
  addSiteError,
  addSiteSuccess,
  addSiteLog,
  onCreateSite,
  onSelectSite,
}: {
  site: string;
  orders: OrderData[] | null;
  siteInput: string;
  setSiteInput: (value: string) => void;
  addingSite: boolean;
  addSiteError: string | null;
  addSiteSuccess: string | null;
  addSiteLog: string[];
  onCreateSite: () => void;
  onSelectSite: (site: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-primary/70">
        Enter the domain you want us to look after. We fetch its favicon and
        connect it to your account in one go.
      </p>

      <form
        className="flex flex-wrap gap-3 items-center"
        onSubmit={(e) => {
          e.preventDefault();
          onCreateSite();
        }}
      >
        <input
          type="text"
          required
          value={siteInput}
          onChange={(e) => setSiteInput(e.target.value)}
          placeholder="www.speedy.site"
          disabled={addingSite}
          className="border border-primary/30 rounded-sm px-3 py-2 text-sm w-full max-w-xs outline-none focus:border-primary"
        />
        <Button type="submit" disabled={addingSite} className={CTA_CLASS}>
          {addingSite && <LoaderCircle className="size-3.5 animate-spin" />}
          Connect site
        </Button>
      </form>

      {addSiteLog.length > 0 && (
        <pre className="rounded-sm border border-primary/20 bg-primary/4 p-3 font-mono text-xs max-h-32 overflow-y-auto text-black dark:text-amber-300">
          {addSiteLog.join("\n")}
        </pre>
      )}

      {addSiteError && <p className="text-xs text-red-500">{addSiteError}</p>}
      {addSiteSuccess && (
        <p className="flex items-center gap-1 text-xs text-emerald-600">
          <Check className="size-3" />
          {addSiteSuccess}
        </p>
      )}

      {/* already-connected sites, for accounts that are not new */}
      {orders && orders.length > 0 && (
        <div className="space-y-2 border-t border-primary/10 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40">
            Or continue with a site you already connected
          </p>
          <div className="flex flex-wrap gap-2">
            {orders.map((order) => (
              <button
                key={order.order_id}
                type="button"
                onClick={() => onSelectSite(order.website_name)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-sm border transition-colors",
                  order.website_name === site
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-primary/20 hover:bg-primary/5",
                )}
              >
                {order.website_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Content section of the tour: a card showing the step title, its summary and
 * the body the user has to act on for that step.
 */
export function StepContent({
  index,
  site,
  plugin,
  hasProbed,
  polling,
  busy,
  orders,
  siteInput,
  setSiteInput,
  addingSite,
  addSiteError,
  addSiteSuccess,
  addSiteLog,
  onCreateSite,
  onDownloadPlugin,
  onCheckPlugin,
  onConfirmPluginInstalled,
  onVerifyInstallation,
  onSelectSite,
}: StepContentProps) {
  const step = STEPS[index];
  const isPluginReady = plugin.installed && plugin.keyed;

  return (
    <StepCard
      eyebrow={`Step ${index + 1} of ${STEPS.length}`}
      title={step.title}
      description={step.description}
    >
      {index === 0 && (
          <AddSiteStep
            site={site}
            orders={orders}
            siteInput={siteInput}
            setSiteInput={setSiteInput}
            addingSite={addingSite}
            addSiteError={addSiteError}
            addSiteSuccess={addSiteSuccess}
            addSiteLog={addSiteLog}
            onCreateSite={onCreateSite}
            onSelectSite={onSelectSite}
          />
        )}

        {index === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-primary/70">
              Download the Speedy Site plugin and activate it on {site}: in
              wp-admin go to Plugins, Add New, Upload Plugin. Your access key is
              assigned to the download automatically, so there is nothing to
              copy or paste.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={onDownloadPlugin}
                disabled={busy === "download"}
                className={CTA_CLASS}
              >
                {busy === "download" ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <FileArchive className="size-3.5" />
                )}
                Download the plugin
              </Button>
              <Button
                variant="outline"
                onClick={onConfirmPluginInstalled}
                disabled={busy === "plugin"}
                className={CTA_CLASS}
              >
                {busy === "plugin" && (
                  <LoaderCircle className="size-3.5 animate-spin" />
                )}
                I installed and activated it
              </Button>
            </div>
            <PluginStatusRow
              site={site}
              plugin={plugin}
              hasProbed={hasProbed}
              polling={polling}
            />
            <PluginStatusPills plugin={plugin} hasProbed={hasProbed} />

            <div className="flex flex-wrap items-center gap-3 border-t border-primary/10 pt-3">
              <Button
                onClick={onVerifyInstallation}
                disabled={busy === "verify" || !isPluginReady}
                className={CTA_CLASS}
              >
                {busy === "verify" && (
                  <LoaderCircle className="size-3.5 animate-spin" />
                )}
                Verify the installation
              </Button>
              <Button
                variant="outline"
                onClick={onCheckPlugin}
                disabled={plugin.loading}
                className={CTA_CLASS}
              >
                {plugin.loading ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  "Check the plugin"
                )}
              </Button>
              {!isPluginReady && (
                <span className="text-xs text-amber-600">
                  Activate the plugin on {site} first.
                </span>
              )}
            </div>

            <p className="text-xs text-primary/60">
              Verifying confirms the connection and assigns the real-user
              collector, served from{" "}
              <code className="font-mono text-[11px] break-all">
                {RUM_SCRIPT_URL}
              </code>
              . The plugin injects it automatically, so data starts flowing as
              soon as the service is active.
            </p>
          </div>
        )}
    </StepCard>
  );
}
