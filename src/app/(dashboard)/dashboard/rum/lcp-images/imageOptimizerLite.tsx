"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";
import {
  Download,
  Zap,
  FileType,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageCircleQuestion,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { CustomTooltip } from "@/components/theme";
import Link from "next/link";

interface Result {
  format: string;
  size: number;
  url: string;
}

export function ImageOptimizerLite({ imageUrl }: { imageUrl: string }) {
  const [results, setResults] = useState<Result[]>([]);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [fileName, setFilename] = useState<string>("");
  const imageRef = useRef<string | null>(null);

  const optimize = useCallback(async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/compression/proxy-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl }),
      });

      if (!response.ok) {
        // Check if it was a timeout (504)
        if (response.status === 504) {
          throw new Error(
            "The external site took too long to respond. Try again or use a different image.",
          );
        }
        throw new Error("Failed to load image.");
      }

      const blob = await response.blob();
      setOriginalSize(blob.size); // Track original size

      setFilename(imageUrl.split("/").pop() || "image");

      const file = new File([blob], fileName, { type: blob.type });

      const formats = ["webp", "jpeg", "png"];
      const newResults: Result[] = [];

      for (const format of formats) {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: `image/${format}`,
          initialQuality: 0.8,
        });

        newResults.push({
          format,
          size: compressed.size,
          url: URL.createObjectURL(compressed),
        });
      }
      setResults(newResults);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      // setFilename("");
    }
  }, [imageUrl]);

  useEffect(() => {
    if (imageRef.current === imageUrl) return;
    setResults([]);
    setOriginalSize(null);
    setIsProcessing(false);
    imageRef.current = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (results.length === 0) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [results]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm flex items-center gap-1 font-normal tracking-wider text-slate-500">
          Try compressing it{" "}
          <CustomTooltip
            side="top"
            content={
              <div className="p-3 max-w-55 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center mb-2 gap-1.5">
                    <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-500/20 rounded flex items-center justify-center">
                      <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
                    </div>
                    <p className="text-xs font-bold text-primary-foreground/80 dark:text-primary/80">
                      SpeedyPixel Lite
                    </p>
                  </div>
                  <p className="text-[12px] leading-relaxed text-primary-foreground/80 dark:text-primary/80">
                    This is a lite version of our image utility. Optimize assets
                    directly in your browser to boost LCP scores.
                  </p>
                </div>

                <Link
                  href="/pixel"
                  target="_blank"
                  className="flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-md transition-all shadow-sm shadow-emerald-200 dark:shadow-none"
                >
                  Try Full Version
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            }
            trigger={
              <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors outline-none">
                <MessageCircleQuestion size={16} />
              </button>
            }
          />
        </h3>
        {!results.length && !isProcessing && (
          <button
            onClick={optimize}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-2"
          >
            <Zap className="w-3 h-3" /> Optimize Now
          </button>
        )}
      </div>

      {isProcessing && (
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span className="text-xs font-medium text-slate-600">
            Generating optimized files...
          </span>
        </div>
      )}

      <div className="grid gap-2">
        {results.map((res) => {
          const isSmaller = originalSize ? res.size < originalSize : true;
          const savings = originalSize
            ? (((originalSize - res.size) / originalSize) * 100).toFixed(0)
            : 0;

          return (
            <div
              key={res.format}
              className={`flex items-center justify-between p-3 bg-white dark:bg-primary/5 border rounded-xl transition-all group ${
                isSmaller
                  ? "border-slate-100 hover:border-emerald-200"
                  : "border-amber-100 bg-amber-50/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isSmaller
                      ? "bg-slate-50 dark:bg-primary/20 text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  <FileType className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-primary">
                      {res.format}
                    </p>
                    {isSmaller ? (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                        -{savings}%
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded">
                        Larger
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-700 dark:text-primary/80">
                    {(res.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!isSmaller && (
                  <div className="group/tip relative">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] rounded-lg opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50">
                      This format is larger than the original. We recommend
                      using WebP for better compression.
                    </div>
                  </div>
                )}
                <a
                  href={res.url}
                  download={`${fileName}.${res.format}`}
                  className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Optimized locally. No data left your browser.
          </p>
          <p className="text-[12px] text-slate-400">
            <span className="font-bold">Tip:</span> Replace the original image
            with the optimized version to significantly reduce LCP
          </p>

          <div
            className={`fixed bottom-4 right-7 w-87.5 h-16 overflow-hidden rounded-xl bg-slate-950 border border-slate-800 flex items-center px-4 group cursor-pointer shadow-xl z-50 transform transition-all duration-500 ease-out
            ${visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
          >
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
            <div className="flex items-center justify-between w-full z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20 shadow-inner">
                  <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                </div>

                <div className="flex flex-col">
                  <h4 className="text-[13px] font-black text-white tracking-tight leading-none">
                    Speedy<span className="text-emerald-400">Pixel</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    Try full version
                  </p>
                </div>
              </div>

              <Link
                href="/pixel"
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
              >
                Free
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
