import { Check, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One entry of the progress row. The whole gateway -- payment, the post-payment
 * details and the tour steps -- is expressed with these, so a single horizontal
 * bar tracks the entire flow.
 */
export type ProgressStep = {
  key: string;
  shortTitle: string;
  /** Green, with a check. */
  done: boolean;
  /** Highlighted as the current position. */
  active: boolean;
  /** Completed and active entries can be clicked to return to them. */
  selectable?: boolean;
  /** Circle content shown while active, instead of a number. */
  marker?: ReactNode;
  /** Index into the tour steps when this entry is one of them. */
  tourIndex?: number;
};

type StepProgressProps = {
  steps: readonly ProgressStep[];
  onSelect?: (index: number) => void;
};

/** Circle + label, shared by every entry so they all match. */
function ProgressItem({
  label,
  tone,
  content,
  onClick,
  disabled,
  current,
}: {
  label: string;
  tone: "done" | "current" | "muted";
  content: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  current?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={current ? "step" : undefined}
      className={cn(
        "group flex w-20 shrink-0 flex-col items-center gap-2 rounded-sm text-center",
        "disabled:cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full border text-xs font-bold transition-colors",
          tone === "done" && "border-emerald-500 bg-emerald-500 text-white",
          tone === "current" &&
            "border-primary bg-primary text-primary-foreground",
          tone === "muted" &&
            "border-dashed border-primary/20 bg-primary/5 text-primary/40",
        )}
      >
        {content}
      </span>

      <span
        className={cn(
          "text-[11px] leading-tight font-medium transition-colors",
          current
            ? "text-primary"
            : tone === "done"
              ? "text-primary/70"
              : "text-primary/50",
          tone === "muted" && "text-primary/40",
        )}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * Horizontal progress: a row of entries joined by a track that fills in as they
 * complete. Completed entries stay clickable to review, the current one is
 * highlighted and anything after it is locked.
 */
export function StepProgress({ steps, onSelect }: StepProgressProps) {
  return (
    <nav
      aria-label="Setup progress"
      className="w-full overflow-x-auto pb-1"
    >
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const locked = !step.done && !step.active;
          const clickable = !locked && (step.selectable || step.active);
          const tone = step.done
            ? "done"
            : step.active
              ? "current"
              : "muted";

          const content = step.done ? (
            <Check className="size-4" />
          ) : locked ? (
            <Lock className="size-3" />
          ) : step.marker ? (
            step.marker
          ) : (
            index + 1
          );

          return (
            <li
              key={step.key}
              className={cn(
                "flex flex-1 items-start",
                index === steps.length - 1 && "flex-none",
              )}
            >
              <ProgressItem
                label={step.shortTitle}
                tone={tone}
                content={content}
                onClick={() => onSelect?.(index)}
                disabled={!clickable || !onSelect}
                current={tone === "current"}
              />

              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "mt-4 h-0.5 flex-1 transition-colors",
                    step.done ? "bg-emerald-500/40" : "bg-primary/15",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
