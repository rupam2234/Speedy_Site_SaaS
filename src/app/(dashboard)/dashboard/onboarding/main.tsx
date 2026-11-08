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
  const { selectedSite, orders } = useSiteContext();

  const siteFromUrl = searchParams.get("site");
  // "Connect another site" starts the same flow from step 1 with no site
  // selected, so the add-site card becomes the active one.
  const isAddingSite = searchParams.get("intent") === "new-site";
  const activeSite = isAddingSite ? "" : (siteFromUrl ?? selectedSite);
  const tour = useOnboardingTour(activeSite, siteFromUrl);

  // Wait for the site context, the per-site entitlement answer and the
  // reconcile answer: rendering any card before they are all known is what made
  // step 1 flash, or the pay button appear when payment was already done.
  if (
    tour.isLoading ||
    tour.hasServiceForSite === null ||
    tour.isReconciling
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

  // One bar for the whole journey: activate -> add site -> plugin -> verify.
  const progressSteps: ProgressStep[] = [
    {
      key: "activate",
      shortTitle: "Activate",
      done: tour.hasServiceForSite,
      active: !tour.hasServiceForSite,
      marker: <CreditCard className="size-4" />,
    },
  ];

  STEPS.forEach((step, index) => {
    progressSteps.push({
      key: `${step.key}-${index}`,
      shortTitle: step.shortTitle,
      done: tour.isStepDone(index),
      active: index === tour.activeIndex,
      selectable: tour.isStepDone(index),
      marker: index + 1,
      tourIndex: index,
    });
  });

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

      {!tour.hasServiceForSite ? (
        <ActivateService busy={tour.busy} onPay={tour.startPayment} />
      ) : tour.isTourComplete ? (
        <SetupComplete
          onGoToDashboard={() => router.push(`/dashboard?site=${activeSite}`)}
          onAddAnotherSite={() =>
            router.push("/dashboard/onboarding?intent=new-site")
          }
        />
      ) : (
        <StepContent
          index={currentStepIndex}
          site={activeSite}
          plugin={tour.plugin}
          hasProbed={tour.hasProbed}
          polling={tour.polling}
          busy={tour.busy}
          orders={orders}
          siteInput={tour.siteInput}
          setSiteInput={tour.setSiteInput}
          addingSite={tour.addingSite}
          addSiteError={tour.addSiteError}
          addSiteSuccess={tour.addSiteSuccess}
          addSiteLog={tour.addSiteLog}
          onCreateSite={tour.createSite}
          onDownloadPlugin={handleDownloadPlugin}
          onCheckPlugin={tour.checkPlugin}
          onConfirmPluginInstalled={tour.confirmPluginInstalled}
          onVerifyInstallation={tour.verifyInstallation}
          onSelectSite={(site) =>
            router.push(`/dashboard/onboarding?site=${site}`)
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
