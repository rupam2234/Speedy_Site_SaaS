"use client";

import { FileWarning } from "lucide-react";
import { CompareCardProps, ComparisonCard, UxGranularData } from ".";
import { useMemo, useState } from "react";
import { countryNameToAlpha2 } from "@/components/countries/alpha2codes";

export function Compare({ uxData }: CompareProps) {
  const [indexA, setIndexA] = useState<number>(0);
  const [indexB, setIndexB] = useState<number>(1);

  const { sagmentA, sagmentB, sortedData } = useMemo(() => {
    const sagmentA = uxData[indexA];
    const sagmentB = uxData[indexB];

    const sortedData = [...uxData].sort((a, b) =>
      a.country.localeCompare(b.country),
    );

    return {
      sagmentA,
      sagmentB,
      sortedData,
    };
  }, [indexA, indexB, uxData]);

  const alphacode2toCountry = useMemo(() => {
    return Object.fromEntries(
      Object.entries(countryNameToAlpha2).map(([country, code]) => [
        code,
        country,
      ]),
    );
  }, []);

  // if (!countryNameToAlpha2) return null;

  const makeKey = (p: any) => `${p.country}__${p.device_type}__${p.network}`;
  const indexMap = useMemo(() => {
    return new Map(uxData.map((p, i) => [makeKey(p), i]));
  }, [uxData]);

  const cardData: CompareCardProps[] = ["lcp", "cls", "inp", "ttfb"].map(
    (item) => {
      return {
        label: item,
        metric: item as "lcp" | "cls" | "inp" | "ttfb",
        valueA: sagmentA[`p75_${item as "lcp" | "cls" | "inp" | "ttfb"}`],
        valueB: sagmentB[`p75_${item as "lcp" | "cls" | "inp" | "ttfb"}`],
      };
    },
  );

  if (!uxData || uxData.length === 0) {
    return (
      <div className="text-sm text-primary/80 flex items-center gap-1">
        <FileWarning size={14} /> We do not have enough data to compare!
      </div>
    );
  }

  return (
    <>
      <h3 className="font-semibold text-primary/70 text-sm">
        Compare (Sagment A {`->`} to Sagment B)
      </h3>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-primary/80 whitespace-nowrap shrink-0">
            Sagment A
          </label>
          <select
            value={indexA}
            onChange={(e) => setIndexA(Number(e.target.value))}
            className="w-full text-primary 
              text-xs border 
              border-primary/10 rounded
              px-2 py-0.5 bg-primary/5 dark:bg-secondary-background
            "
          >
            {sortedData &&
              sortedData.map((x) => {
                const index = indexMap.get(
                  `${x.country}__${x.device_type}__${x.network}`,
                );

                return (
                  <option value={index} key={index}>
                    {alphacode2toCountry[x.country] || x.country} -{" "}
                    {x.device_type} - ({x.network === null ? "WiFi" : x.network}
                    )
                  </option>
                );
              })}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-primary/80 whitespace-nowrap shrink-0">
            Sagment B
          </label>
          <select
            value={indexB}
            onChange={(e) => setIndexB(Number(e.target.value))}
            className="w-full text-primary 
              text-xs border 
              border-primary/10 rounded
              px-2 py-0.5 bg-primary/5 dark:bg-secondary-background
            "
          >
            {sortedData &&
              sortedData.map((x) => {
                const index = indexMap.get(
                  `${x.country}__${x.device_type}__${x.network}`,
                );

                return (
                  <option value={index} key={index}>
                    {alphacode2toCountry[x.country] || x.country} -{" "}
                    {x.device_type} - ({x.network === null ? "WiFi" : x.network}
                    )
                  </option>
                );
              })}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {cardData?.map((x) => (
          <ComparisonCard
            key={x.metric}
            label={x.label}
            metric={x.metric}
            valueA={x.valueA}
            valueB={x.valueB}
          />
        ))}
      </div>
    </>
  );
}

type CompareProps = {
  uxData: UxGranularData[];
};
