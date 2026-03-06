"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

import { cn } from "@/lib/utils";
import {
  Settings2,
  Info,
  Trash2,
  Download,
  Layers,
  Maximize2,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import imageCompression from "browser-image-compression";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import { ComparisonSlider, DropZone, ResultCard } from ".";
import { CustomTooltip } from "@/components/theme";

interface ConversionResult {
  format: string;
  size: number;
  url: string;
  savings: number;
  loadingTime: number;
}

interface OptimizedFile {
  id: string;
  original: File;
  originalUrl: string;
  results: ConversionResult[];
  isProcessing: boolean;
  selectedFormat: string;
}

export default function ImageOptimizer() {
  const [files, setFiles] = useState<OptimizedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [quality, setQuality] = useState(0.8);
  const [removeMetadata, setRemoveMetadata] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  // const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId),
    [files, activeFileId],
  );

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const optimizedFiles: OptimizedFile[] = newFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        original: file,
        originalUrl: URL.createObjectURL(file),
        results: [],
        isProcessing: true,
        selectedFormat: "webp",
      }));
      setFiles((prev) => [...prev, ...optimizedFiles]);
      if (!activeFileId) setActiveFileId(optimizedFiles[0].id);
    },
    [activeFileId],
  );

  const handleQualityChange = (val: number) => {
    setQuality(val);
    setFiles((prev) => prev.map((f) => ({ ...f, isProcessing: true })));
  };

  const handleMetadataToggle = () => {
    const newVal = !removeMetadata;
    setRemoveMetadata(newVal);
    setFiles((prev) => prev.map((f) => ({ ...f, isProcessing: true })));
  };

  const processFile = useCallback(
    async (optFile: OptimizedFile) => {
      const formats = ["webp", "jpeg", "png"];
      const newResults: ConversionResult[] = [];

      for (const format of formats) {
        const options = {
          maxSizeMB: 10,
          maxWidthOrHeight: 4096,
          useWebWorker: true,
          fileType: `image/${format}`,
          initialQuality: quality,
          preserveExif: !removeMetadata,
        };

        try {
          const compressedFile = await imageCompression(
            optFile.original,
            options,
          );
          const url = URL.createObjectURL(compressedFile);
          const size = compressedFile.size;
          const loadingTime = Math.round((size / 1024 / 200) * 1000);

          newResults.push({
            format,
            size,
            url,
            savings: optFile.original.size - size,
            loadingTime,
          });
        } catch (err) {
          console.error(`Error processing ${format}:`, err);
        }
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === optFile.id
            ? { ...f, results: newResults, isProcessing: false }
            : f,
        ),
      );
    },
    [quality, removeMetadata],
  );

  // Re-process all files when global settings change
  useEffect(() => {
    const unprocessed = files.filter((f) => f.isProcessing);
    if (unprocessed.length > 0) {
      unprocessed.forEach(processFile);
    }
  }, [files, processFile]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (activeFileId === id)
      setActiveFileId(files.find((f) => f.id !== id)?.id || null);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    for (const file of files) {
      const result = file.results.find((r) => r.format === file.selectedFormat);
      if (result) {
        const response = await fetch(result.url);
        const blob = await response.blob();
        zip.file(
          `${file.original.name.split(".")[0]}.${file.selectedFormat}`,
          blob,
        );
      }
    }
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "optimized-images.zip";
    link.click();
  };

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Configuration & Batch List */}
        <aside className="lg:col-span-4 space-y-8">
          {/* Global Settings */}
          <section className="bg-white rounded-md border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-slate-900">Global Settings</h2>
              </div>
              <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                <CustomTooltip
                  content={
                    <div>
                      Configure these settings before uploading an image.
                      Changes made after an image is provided will not affect
                      the current upload.
                    </div>
                  }
                  trigger={<Info className="w-4 h-4" />}
                  side="right"
                />
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Quality
                  </label>
                  <span className="text-sm font-mono text-emerald-600 font-black">
                    {Math.round(quality * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={quality}
                  onChange={(e) =>
                    handleQualityChange(parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Remove Metadata
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Strip EXIF, GPS, and camera data
                  </p>
                </div>
                <button
                  onClick={handleMetadataToggle}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    removeMetadata ? "bg-emerald-600" : "bg-slate-200",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      removeMetadata ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* File List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4" /> Queue ({files.length})
              </h3>
              <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === "grid"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-400",
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === "list"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-400",
                  )}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-125 overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="sync">
                {files.map((f) => (
                  <div
                    className={`group relative flex items-center gap-4 p-3 rounded-md cursor-pointer ${
                      activeFileId === f.id
                        ? "bg-white border-emerald-500 border-2 ring-emerald-500"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setActiveFileId(f.id)}
                    key={f.id}
                  >
                    <div className="w-14 h-14 rounded-md overflow-hidden bg-slate-100 shrink-0">
                      <img
                        src={f.originalUrl}
                        alt="Thumb"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {f.original.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase">
                        {(f.original.size / 1024).toFixed(0)} KB •{" "}
                        {f.isProcessing ? "Processing..." : "Ready"}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(f.id);
                      }}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all text-slate-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </AnimatePresence>

              <DropZone onFilesSelect={addFiles} hasFiles={files.length > 0} />
            </div>
          </section>
        </aside>

        {/* Right: Active File Editor & Comparison */}
        <div className="lg:col-span-8 space-y-8">
          <AnimatePresence mode="wait">
            {activeFile ? (
              <div className="space-y-8">
                {/* Comparison Section */}
                <section className="bg-white rounded-md border border-slate-200 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        Visual Comparison
                      </h2>
                      <p className="text-sm text-slate-500">
                        Slide to compare original vs optimized
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {["webp", "jpeg", "png"].map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() =>
                            setFiles((prev) =>
                              prev.map((f) =>
                                f.id === activeFile.id
                                  ? { ...f, selectedFormat: fmt }
                                  : f,
                              ),
                            )
                          }
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            activeFile.selectedFormat === fmt
                              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                          )}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeFile.results.length > 0 ? (
                    <ComparisonSlider
                      before={activeFile.originalUrl}
                      after={
                        activeFile.results.find(
                          (r) => r.format === activeFile.selectedFormat,
                        )?.url || ""
                      }
                      afterLabel={`${activeFile.selectedFormat.toUpperCase()} Optimized`}
                    />
                  ) : (
                    <div className="aspect-video bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200">
                      <div className="animate-pulse flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-200 rounded-full" />
                        <div className="h-2 w-24 bg-slate-200 rounded-full" />
                      </div>
                    </div>
                  )}
                </section>

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {activeFile.results.map((res) => (
                    <ResultCard
                      key={res.format}
                      result={res}
                      originalSize={activeFile.original.size}
                    />
                  ))}
                </div>

                {/* Advanced Stats */}
                {/* <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-emerald-900 rounded-3xl p-8 text-white shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        <Zap className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="font-bold text-lg">Speed Optimization</h3>
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-300 text-sm">
                          Payload Reduction
                        </span>
                        <span className="text-2xl font-black">
                          {activeFile.results.length > 0
                            ? (
                                100 -
                                (activeFile.results.find(
                                  (r) => r.format === activeFile.selectedFormat,
                                )!.size /
                                  activeFile.original.size) *
                                  100
                              ).toFixed(1)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-xs text-emerald-200 leading-relaxed">
                          By switching to{" "}
                          <span className="text-white font-bold uppercase">
                            {activeFile.selectedFormat}
                          </span>
                          , you save{" "}
                          <span className="text-white font-bold">
                            {(
                              (activeFile.original.size -
                                (activeFile.results.find(
                                  (r) => r.format === activeFile.selectedFormat,
                                )?.size || 0)) /
                              1024
                            ).toFixed(0)}{" "}
                            KB
                          </span>{" "}
                          per user visit. This significantly improves your Core
                          Web Vitals (LCP).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Palette className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg text-slate-900">
                        Color Profile
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="flex-1 aspect-square rounded-lg bg-slate-100 animate-pulse"
                        />
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-slate-500">
                      Dominant color extraction and palette generation coming
                      soon.
                    </p>
                  </div>
                </section> */}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
                  <Maximize2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">
                  No Image Selected
                </h2>
                <p className="text-slate-500 max-w-sm">
                  Upload images to start optimizing. Select an image from the
                  queue to see detailed comparisons.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-6 left-6 z-50">
        {files.length > 0 && (
          <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl shadow-xl px-5 py-3">
            <div className="hidden md:flex items-center gap-4 pr-4 border-r border-slate-200">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Saved
                </p>
                <p className="text-sm font-black text-emerald-600">
                  {(
                    files.reduce((acc, f) => {
                      const best = f.results.find(
                        (r) => r.format === f.selectedFormat,
                      );
                      return acc + (best ? f.original.size - best.size : 0);
                    }, 0) /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </p>
              </div>
            </div>

            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={downloadAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
            >
              <Download className="w-4 h-4" />
              Download ZIP ({files.length})
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
