"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import TooltipIcon from "@/components/utils/customTooltip";
import { useMemo, useState } from "react";
import { alpha3ToAlpha2 } from "..";

type CountryData = {
  code: string;
  traffic: number;
};

type CountryStripeProps = {
  data: CountryData[];
};

export function CountryStripe({ data }: CountryStripeProps) {
  const { theme } = useTheme();

  const COLUMN_WIDTH = 90; // px
  const [windowWidth, _] = useState<number>(852); // in px
  const [scrollLeft, setScrollLeft] = useState<number>(0); // default left position in px

  const leftIndex = Math.floor(scrollLeft / COLUMN_WIDTH);
  const columnInsideWindow = Math.ceil(windowWidth / COLUMN_WIDTH);
  const rightIndex = leftIndex + columnInsideWindow;

  const sortedData = useMemo(
    () => [...data].sort((a, b) => b.traffic - a.traffic),
    [data],
  );

  const visibleItems =
    sortedData.length > 0 ? sortedData.slice(leftIndex, rightIndex) : [];

  return (
    <div
      style={{
        position: "relative",
        width: "auto",
        overflow: "auto",
        scrollBehavior: "smooth",
        scrollbarWidth: "thin",
        scrollbarColor:
          theme === "light" ? "#dfdfdf #f5f5f5" : "#343434 #1c1c1c",
        height: "40px",
        marginTop: "8px",
      }}
      onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
    >
      <div
        style={{
          width: data && data.length * COLUMN_WIDTH,
          position: "relative",
          height: "20px",
        }}
      >
        {visibleItems &&
          visibleItems.map((column, index) => {
            const actualIndex = leftIndex + index;

            return (
              <div
                key={column.code}
                style={{
                  position: "absolute",
                  left: actualIndex * COLUMN_WIDTH,
                  top: 0,
                  paddingLeft: "10px",
                  //   paddingRight: "4px",
                  width: COLUMN_WIDTH,
                  borderRight: `1px solid ${theme === "light" ? `#dfdfdf` : `#343434`}`,
                }}
                className="flex text-sm text-primary/80 items-center gap-1"
              >
                <span>{getFlagFromAlpha3(column.code)}</span>
                <TooltipIcon
                  content={
                    <div className="flex items-center gap-2">
                      {getFlagFromAlpha3(column.code)}
                      <span>{column.traffic} users</span>
                    </div>
                  }
                  trigger={
                    <span
                      className={
                        theme === "dark" ? "text-blue-300" : "text-blue-400"
                      }
                    >
                      {column.traffic}
                    </span>
                  }
                  side="left"
                />
              </div>
            );
          })}
      </div>
    </div>
  );

  function getFlagFromAlpha3(alpha3: string, size = 20) {
    const alpha2 = alpha3ToAlpha2[alpha3.toUpperCase()];
    if (!alpha2) return null;

    return (
      <img
        src={`https://flagcdn.com/w${size}/${alpha2}.png`}
        alt={`${alpha3} flag`}
        width={size}
        height={14}
        style={{ display: "inline-block" }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
}
