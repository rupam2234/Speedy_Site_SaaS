import Link from "next/link";
import {
  Check,
  FileArchive,
  LoaderCircle,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepCard } from "./StepCard";
import { STEPS } from "./steps";
import type { VerifyStatus } from "./useOnboardingTour";

const CTA_CLASS =
  "h-9 rounded-sm px-4 text-xs font-bold uppercase tracking-wide";

type StepContentProps = {
  index: number;
  site: string;
  /** Single state for the verify button + success message on the plugin step. */
  verifyStatus: VerifyStatus;
  busy: string | null;
  error: string | null;
  isStepDone: (index: number) => boolean;
  isTourComplete: boolean;
  goNext: () => void;
  goToStep: (index: number) => void;
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
  onVerifyInstallation: () => void;
};

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
      {/* <p className="text-xs text-primary/70">
        Enter the domain you want us to help speed up and monitor performance.
      </p> */}

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
            Go to configuration status â†’
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
  verifyStatus,
  busy,
  error,
  isStepDone,
  isTourComplete,
  goNext,
  goToStep,
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
  onVerifyInstallation,
}: StepContentProps) {
  const step = STEPS[index];
  const isLastTourStep = index === STEPS.length - 1;
  const isStepCompleted = isStepDone(index);

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
        <div className="space-y-4">
          <p className="text-xs text-primary/70">
            Download the Speedy Site plugin and activate it on {site}: in
            wp-admin go to Plugins, Add New, Upload Plugin. Your access key is
            assigned to the download automatically, so there is nothing to copy
            or paste.
          </p>

          {/* Download button - always visible */}
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
          </div>

          {/* Verify installation button with ONE status line under it: the
              error and the success message share the same slot (they can
              never both be set -- every attempt clears `error` first). */}
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={onVerifyInstallation}
              disabled={verifyStatus === "verifying"}
              className={`${CTA_CLASS} w-auto justify-start text-left gap-2`}
            >
              {verifyStatus === "verifying" ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Verifying...
                </>
              ) : verifyStatus === "verified" ? (
                <>
                  <CheckCircle className="size-3.5 text-emerald-600" />
                  Verified
                </>
              ) : (
                <>
                  <FileArchive className="size-3.5 text-primary/50" />
                  Verify installation
                </>
              )}
            </Button>
            {error ? (
              <p className="text-xs text-red-500">{error}</p>
            ) : (
              verifyStatus === "verified" && (
                <p className="text-xs text-emerald-600">
                  Plugin installed and verified successfully
                </p>
              )
            )}
          </div>
        </div>
      )}

      {/* Next/Complete Payment button at bottom of each step */}
      {!isTourComplete && (
        <div className="mt-6 pt-4 border-t border-primary/10 flex justify-between">
          {/* Back button (except step 0) */}
          {index > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(index - 1)}
              className="h-8 px-3 text-xs"
            >
              Back
            </Button>
          )}

          {/* Next or Complete Payment button. "Go to dashboard" deliberately
              lives only on the completion page (ActivateService once payment
              is confirmed), never on a tour step like this one. */}
          <div className="flex items-center gap-2 ml-auto">
            {isStepCompleted && isLastTourStep ? (
              // Last step completed - show Complete Payment
              <Button
                onClick={goNext}
                className="h-9 rounded-lg px-5 text-xs font-bold uppercase tracking-wide"
              >
                Complete Payment <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : isLastTourStep ? (
              // Last step not completed - show Next (disabled until done)
              <Button
                onClick={goNext}
                disabled={!isStepCompleted}
                className="h-9 rounded-lg px-5 text-xs font-bold uppercase tracking-wide"
              >
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              // Middle steps - show Next
              <Button
                onClick={goNext}
                disabled={!isStepCompleted}
                className="h-9 rounded-lg px-5 text-xs font-bold uppercase tracking-wide"
              >
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </StepCard>
  );
}
