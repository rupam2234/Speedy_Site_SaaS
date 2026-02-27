import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

interface TooltipIconProps {
  content: string | React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  trigger?: React.ReactNode;
  maxWidth?: string;
  delay?: number;
}

export default function TooltipIcon({
  content,
  side = "left",
  trigger,
  maxWidth = "300px",
  delay = 300,
}: TooltipIconProps) {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        setRect(triggerRef.current.getBoundingClientRect());
        setVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  // Recalculate position on scroll / resize
  useEffect(() => {
    if (!visible) return;

    const updatePosition = () => {
      if (triggerRef.current) {
        setRect(triggerRef.current.getBoundingClientRect());
      }
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [visible]);

  const spacing = 8;

  const getPositionStyle = (): React.CSSProperties => {
    if (!rect) return {};

    switch (side) {
      case "top":
        return {
          top: rect.top - spacing,
          left: rect.left + rect.width / 2,
          transform: "translate(-50%, -100%)",
        };
      case "right":
        return {
          top: rect.top + rect.height / 2,
          left: rect.right + spacing,
          transform: "translateY(-20%)",
        };
      case "bottom":
        return {
          top: rect.bottom + spacing,
          left: rect.left + rect.width / 2,
          transform: "translate(-50%, 0)",
        };
      case "left":
      default:
        return {
          top: rect.top + rect.height / 2,
          left: rect.left - spacing,
          transform: "translate(-100%, -20%)",
        };
    }
  };

  const arrowBase = "absolute w-0 h-0 border-transparent";

  const getArrowClasses = () => {
    switch (side) {
      case "top":
        return "bottom-[-8px] left-1/2 -translate-x-1/2 border-x-8 border-t-8 border-t-gray-700";
      case "right":
        return "left-[-8px] top-1/5 -translate-y-1/2 border-y-8 border-r-8 border-r-gray-700";
      case "bottom":
        return "top-[-8px] left-1/2 -translate-x-1/2 border-x-8 border-b-8 border-b-gray-700";
      case "left":
        return "right-[-8px] top-1/5 -translate-y-1/2 border-y-8 border-l-8 border-l-gray-700";
      default:
        return "right-[-8px] top-1/5 -translate-y-1/2 border-y-8 border-l-8 border-l-gray-700";
    }
  };

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex cursor-pointer"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
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
      </span>

      {visible &&
        rect &&
        createPortal(
          <div
            className="fixed z-9999 pointer-events-none"
            style={getPositionStyle()}
          >
            <div
              className="relative p-2 text-xs text-white bg-gray-700 rounded shadow-md"
              style={{ maxWidth, width: "max-content" }}
            >
              <div className={clsx(arrowBase, getArrowClasses())} />
              {content}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
