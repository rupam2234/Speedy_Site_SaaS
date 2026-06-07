import { ReactNode } from "react";
import TooltipIcon from "./customTooltip";

interface TitleProps {
  title: string;
  description: string;
  tooltip?: ReactNode;
}

export function Title({ title, description, tooltip }: TitleProps) {
  return (
    <div className="flex items-center gap-3 w-full md:w-auto">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-primary/80 tracking-tight">
            {title}
          </h2>

          <TooltipIcon content={tooltip} side="bottom" />
        </div>

        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
          {description}
        </p>
      </div>
    </div>
  );
}
