"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingAnimation } from "@/components/theme/loadingAnimation";
import { useSiteContext } from "../siteContext";
import { ActivateService } from "./ActivateService";
import { SetupComplete } from "./SetupComplete";
import { StepContent } from "./StepContent";
import { StepProgress, type ProgressStep } from "./StepProgress";
import { STEPS } from "./steps";
import { useOnboardingTour } from "./useOnboardingTour";

/**
 * Managed service setup shell: the single gateway flow.
 *
 * Every state -- paying, finishing the post-payment details, the four tour
 * steps and completion -- renders through the same frame: header, one
 * horizontal progress bar, one card.
 */
export default function Main() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedSite } = useSiteContext();

  const siteFromUrl = searchParams.get("site");
  // "Connect another site" starts the same flow from step 1 with no site
  // selected, so the add-site card becomes the active one.
  const isAddingSite = searchParams.get("intent") === "new-site";
  const activeSite = isAddingSite ? "" : (siteFromUrl ?? selectedSite);
  const tour = useOnboardingTour(activeSite, siteFromUrl);

  // Only the payment card depends on the per-site entitlement answers, so only
  // it waits for them: the tour steps are fully determined by the order row and
  // render the moment orders are known. Gating everything on hasPaidForSite /
  // hasServiceForSite / reconcile is what made the step 1 -> step 2 handoff
  // flash a full-screen loader: switching the url to ?site=<new site> re-runs
  // those checks, and their null state blocked the whole page for a round-trip
  // even though the next card was already decided. When the tour IS complete
  // we still wait, so the pay button never flashes before we know whether
  // payment already happened.
  if (
    tour.isLoading ||
    (tour.isTourComplete &&
      (tour.hasPaidForSite === null || tour.isReconciling))
  ) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  // The stepper can look at any completed step, so the panel follows the step
  // the user clicked and falls back to the active one.
  const currentStepIndex = tour.viewedStep ?? tour.activeIndex;

  // One bar for the whole journey: add site -> plugin -> activate (payment).
  const progressSteps: ProgressStep[] = [
    ...STEPS.map((step, index) => ({
      key: `${step.key}-${index}`,
      shortTitle: step.shortTitle,
      done: tour.isStepDone(index),
      active: index === tour.activeIndex && !tour.isTourComplete,
      selectable: tour.isStepDone(index),
      marker: index + 1,
      tourIndex: index,
    })),
    {
      key: "activate",
      shortTitle: "Activate",
      done: Boolean(tour.hasPaidForSite),
      active: tour.isTourComplete && !tour.hasPaidForSite,
      marker: <CreditCard className="size-4" />,
    },
  ];

  const handleSelectStep = (index: number) => {
    const entry = progressSteps[index];

    if (entry.tourIndex === undefined) return;
    if (!tour.isStepDone(entry.tourIndex)) return;
    tour.setViewedStep(
      entry.tourIndex === tour.activeIndex ? null : entry.tourIndex,
    );
  };

  // The zip builder pulls in JSZip, so it only loads when the user asks for it.
  const handleDownloadPlugin = () =>
    tour.downloadPlugin(async (domain) => {
      const { downloadPluginZip } =
        await import("../wordpress-plugin-analysis/companionPlugin");
      await downloadPluginZip(domain);
    });

  const doneCount = progressSteps.filter((step) => step.done).length;

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary">Service setup</h1>
          {!tour.hasServiceForSite ? (
            <p className="text-sm text-primary/70 mt-1">
              Connect a WordPress site {">"} Verify plugin connection {">"}{" "}
              Start continious performance monitoring & data backed optimization
            </p>
          ) : (
            <p className="text-sm text-primary/70 mt-1">
              {isAddingSite
                ? "Connect another site and it will run through the same integration steps."
                : `${STEPS.length} short steps to connect ${activeSite || "your site"} and start real-user monitoring.`}
            </p>
          )}
        </div>
        <p className="text-xs font-medium text-primary/60">
          {doneCount} of {progressSteps.length} complete
        </p>
      </header>

      {tour.error && (
        <p className="text-xs text-red-500 border border-red-500/30 bg-red-500/5 rounded-sm px-3 py-2">
          {tour.error}
        </p>
      )}

      <StepProgress steps={progressSteps} onSelect={handleSelectStep} />

      {!tour.isTourComplete ? (
        <StepContent
          index={currentStepIndex}
          site={activeSite}
          plugin={tour.plugin}
          hasProbed={tour.hasProbed}
          polling={tour.polling}
          busy={tour.busy}
          siteInput={tour.siteInput}
          setSiteInput={tour.setSiteInput}
          wpLoginUrl={tour.wpLoginUrl}
          setWpLoginUrl={tour.setWpLoginUrl}
          existingSite={tour.existingSite}
          addingSite={tour.addingSite}
          addSiteError={tour.addSiteError}
          addSiteSuccess={tour.addSiteSuccess}
          onCreateSite={tour.createSite}
          onDownloadPlugin={handleDownloadPlugin}
          onCheckPlugin={tour.checkPlugin}
          onConfirmPluginInstalled={tour.confirmPluginInstalled}
          onVerifyInstallation={tour.verifyInstallation}
        />
      ) : !tour.hasPaidForSite ? (
        <ActivateService busy={tour.busy} onPay={tour.startPayment} />
      ) : (
        <SetupComplete
          onGoToDashboard={() => router.push(`/dashboard?site=${activeSite}`)}
          onAddAnotherSite={() =>
            router.push("/dashboard/onboarding?intent=new-site")
          }
        />
      )}

      <SetupFooter />
    </div>
  );
}

function SetupFooter() {
  return (
    <p className="text-[11px] text-primary/50">
      Questions?{" "}
      <Link
        href="/dashboard/tickets"
        className="text-primary/70 underline hover:text-primary"
      >
        Open a support ticket
      </Link>{" "}
      and our team will walk you through it.
    </p>
  );
}
