import Link from "next/link";
import { Blocks, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STEPS } from "./steps";
import { StepCard } from "./StepCard";

const CTA_CLASS =
  "h-10 rounded-lg px-5 text-xs font-bold uppercase tracking-wide";

type ActivateServiceProps = {
  busy: string | null;
  onPay: () => void;
};

/**
 * Payment gate.
 *
 * There is no free tier, so a site can only be connected behind an active
 * managed_wp entitlement: this card comes first, and the setup steps only open
 * once the service is live. It uses the same step-card frame as the tour, so
 * the whole gateway reads as one sequence of cards.
 */
export function ActivateService({ busy, onPay }: ActivateServiceProps) {
  return (
    <StepCard
      eyebrow="Service activation"
      title="Activate the service to connect your site"
      description="One payment, one year of service. No auto-renewal."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Blocks className="size-4 text-primary" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-primary">
              $299
            </span>
            <span className="text-xs font-medium text-primary/60">
              one-time payment · one year of service
            </span>
          </div>
        </div>

        <p className="max-w-prose text-sm leading-relaxed text-primary/70">
          Real-user performance data monitoring, diagnosis and performance
          optimization for your site. You also get the WP Rocket caching plugin
          as part of the optimization practice (optional).
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button
            onClick={onPay}
            disabled={busy === "payment"}
            className={CTA_CLASS}
          >
            {busy === "payment" && (
              <LoaderCircle className="size-3.5 animate-spin" />
            )}
            Pay $299
          </Button>
          <Link
            href="/dashboard/pricing"
            className="text-xs font-medium text-primary/60 underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            Compare plans
          </Link>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40">
            Once the service is active, you will
          </p>
          <ol className="space-y-2">
            {STEPS.map((step, index) => (
              <li
                key={`${step.key}-${index}`}
                className="flex items-start gap-3"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                  {index + 1}
                </span>
                <span className="text-sm leading-snug text-primary/80">
                  {step.title}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] leading-relaxed text-primary/50">
            Nothing is configured until you go through them, so there is no rush.
          </p>
        </div>
      </div>
    </StepCard>
  );
}
