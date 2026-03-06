"use client";

import React, { useState } from "react";

interface ComparisonSliderProps {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function ComparisonSlider({
  before,
  after,
  beforeLabel = "Original",
  afterLabel = "Optimized",
}: ComparisonSliderProps) {
  const [sliderPos, setSliderPos] = useState(50);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    const x =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(Math.max(position, 0), 100));
  };

  return (
    <div
      className="relative aspect-video w-full rounded-md overflow-hidden cursor-ew-resize select-none border border-slate-200 shadow-inner bg-slate-100"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
    >
      {/* After Image (Optimized) */}
      <div className="absolute inset-0">
        <img src={after} alt="After" className="w-full h-full object-contain" />
        <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold rounded uppercase tracking-widest">
          {afterLabel}
        </div>
      </div>

      {/* Before Image (Original) with Clip Path */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <img
          src={before}
          alt="Before"
          className="w-full h-full object-contain"
        />
        <div className="absolute bottom-4 left-4 px-2 py-1 bg-white/80 backdrop-blur-md text-slate-900 text-[10px] font-bold rounded uppercase tracking-widest">
          {beforeLabel}
        </div>
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] z-10"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-3 bg-slate-300 rounded-full" />
            <div className="w-0.5 h-3 bg-slate-300 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
