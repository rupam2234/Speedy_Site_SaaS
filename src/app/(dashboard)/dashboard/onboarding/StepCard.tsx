import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type StepCardProps = {
  /** Small uppercase label above the title, e.g. "Step 2 of 4". */
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * The shared card frame of the setup tour: the stepper sits above it and every
 * step body lives inside it, including the post-payment prompt, so the whole
 * flow reads as one card rather than a page of panels.
 */
export function StepCard({
  eyebrow,
  title,
  description,
  children,
}: StepCardProps) {
  return (
    <Card className="gap-0 rounded-sm border-primary/10 py-0 shadow-none">
      <CardHeader className="gap-1.5 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40">
          {eyebrow}
        </p>
        <CardTitle className="text-sm font-bold text-primary">
          {title}
        </CardTitle>
        {description && <p className="text-xs text-primary/60">{description}</p>}
      </CardHeader>

      <Separator className="bg-primary/10" />

      <CardContent className="px-5 py-4">{children}</CardContent>
    </Card>
  );
}
