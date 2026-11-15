import Link from "next/link";
import { Check, FileArchive, LoaderCircle, Lock } from "lucide-react";
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
  // "add your site"
  siteInput: string;
  setSiteInput: (value: string) => void;
  wpLoginUrl: string;
  setWpLoginUrl: (value: string) => void;
  addingSite: boolean;
  addSiteError: string | null;
  addSiteSuccess: string | null;
  existingSite: { order_id: string; website_name: string } | null;
  onCreateSite: () => void;
  // later steps
  onDownloadPlugin: () => void;
  onCheckPlugin: () => void;
  onConfirmPluginInstalled: () => void;
  onVerifyInstallation: () => void;
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
  siteInput,
  setSiteInput,
  wpLoginUrl,
  setWpLoginUrl,
  addingSite,
  addSiteError,
  addSiteSuccess,
  existingSite,
  onCreateSite,
}: {
  siteInput: string;
  setSiteInput: (value: string) => void;
  wpLoginUrl: string;
  setWpLoginUrl: (value: string) => void;
  addingSite: boolean;
  addSiteError: string | null;
  addSiteSuccess: string | null;
  existingSite: { order_id: string; website_name: string } | null;
  onCreateSite: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-primary/70">
        Enter the domain you want us to help speed up and monitor performance.
      </p>

      <form
        className="flex flex-col items-start gap-3 w-full max-w-md"
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
          placeholder="yoursite.com"
          disabled={addingSite}
          className="border border-primary/30 rounded-sm px-3 py-2 text-sm w-full max-w-xs outline-none focus:border-primary"
        />
        <input
          type="text"
          required
          value={wpLoginUrl}
          onChange={(e) => setWpLoginUrl(e.target.value)}
          placeholder="https://example.com/wp-login.php"
          disabled={addingSite}
          className="border border-primary/30 rounded-sm px-3 py-2 text-sm w-full max-w-xs outline-none focus:border-primary"
        />
        <Button type="submit" disabled={addingSite}>
          {addingSite && <LoaderCircle className="size-3.5 animate-spin" />}
          {addingSite ? <>Connecting...</> : <>Connect site</>}
        </Button>
      </form>

      {existingSite && (
        <div className="rounded-sm border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
          <p className="text-xs font-medium text-emerald-700">
            {existingSite.website_name} is already connected to your account.
          </p>
          <p className="text-[10px] text-emerald-600">
            Continue setup at its configuration status page.
          </p>
          <Link
            href={`/dashboard/onboarding?site=${existingSite.website_name}`}
            className="text-xs font-medium text-emerald-600 underline hover:text-emerald-700"
          >
            Go to configuration status →
          </Link>
        </div>
      )}

      <p className="text-[10px] text-primary/50">
        The login URL is where you access wp-admin. This is a reference for
        experts to work on your site during performance optimization.
      </p>

      {addSiteError && <p className="text-xs text-red-500">{addSiteError}</p>}
      {addSiteSuccess && (
        <p className="flex items-center gap-1 text-xs text-emerald-600">
          <Check className="size-3" />
          {addSiteSuccess}
        </p>
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
  siteInput,
  setSiteInput,
  wpLoginUrl,
  setWpLoginUrl,
  existingSite,
  addingSite,
  addSiteError,
  addSiteSuccess,
  onCreateSite,
  onDownloadPlugin,
  onCheckPlugin,
  onConfirmPluginInstalled,
  onVerifyInstallation,
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
          siteInput={siteInput}
          setSiteInput={setSiteInput}
          wpLoginUrl={wpLoginUrl}
          setWpLoginUrl={setWpLoginUrl}
          existingSite={existingSite}
          addingSite={addingSite}
          addSiteError={addSiteError}
          addSiteSuccess={addSiteSuccess}
          onCreateSite={onCreateSite}
        />
      )}

      {index === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-primary/70">
            Download the Speedy Site plugin and activate it on {site}: in
            wp-admin go to Plugins, Add New, Upload Plugin. Your access key is
            assigned to the download automatically, so there is nothing to copy
            or paste.
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
