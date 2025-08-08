import React from "react";
import clsx from "clsx";

interface TooltipIconProps {
  content: string;
  side?: "top" | "right" | "bottom" | "left";
  trigger?: React.ReactNode;
  maxWidth?: string; // e.g. "16rem", "200px", or "none" (default auto)
}

const TooltipIcon: React.FC<TooltipIconProps> = ({
  content,
  side = "left",
  trigger,
  maxWidth,
}) => {
  const tooltipBaseClasses =
    "absolute z-10 hidden p-2 text-xs text-white bg-gray-700 rounded shadow-md group-hover:block";

  const getTooltipPosition = () => {
    switch (side) {
      case "top":
        return "bottom-full left-1/2 transform -translate-x-1/2 mb-2";
      case "right":
        return "left-full top-1/2 transform -translate-y-1/2 ml-2";
      case "bottom":
        return "top-full left-1/2 transform -translate-x-1/2 mt-2";
      case "left":
      default:
        return "right-full top-1/2 transform -translate-y-1/2 mr-2";
    }
  };

  const arrowBaseClasses = "absolute w-0 h-0 border-transparent";

  const getArrowPosition = () => {
    switch (side) {
      case "top":
        return "bottom-[-8px] left-1/2 transform -translate-x-1/2 border-x-8 border-x-transparent border-t-8 border-t-gray-700";
      case "right":
        return "left-[-8px] top-1/2 transform -translate-y-1/2 border-y-8 border-y-transparent border-r-8 border-r-gray-700";
      case "bottom":
        return "top-[-8px] left-1/2 transform -translate-x-1/2 border-x-8 border-x-transparent border-b-8 border-b-gray-700";
      case "left":
      default:
        return "right-[-8px] top-1/2 transform -translate-y-1/2 border-y-8 border-y-transparent border-l-8 border-l-gray-700";
    }
  };

  return (
    <span className="relative group cursor-pointer inline-block">
      {trigger ?? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-label="Info tooltip"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
          />
        </svg>
      )}

      <div
        className={clsx(tooltipBaseClasses, getTooltipPosition())}
        style={{ maxWidth: maxWidth || "300px", width: "max-content" }}
      >
        <div className={clsx(arrowBaseClasses, getArrowPosition())} />
        {content}
      </div>
    </span>
  );
};

export default TooltipIcon;
