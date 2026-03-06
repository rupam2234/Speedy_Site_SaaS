"use client";

import React, { useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFilesSelect: (files: File[]) => void;
  hasFiles: boolean;
}

export function DropZone({ onFilesSelect, hasFiles }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length > 0) {
        onFilesSelect(files);
      }
    },
    [onFilesSelect],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length > 0) {
        onFilesSelect(files);
      }
    },
    [onFilesSelect],
  );

  return (
    <div className="w-full">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed rounded-3xl p-10 transition-all duration-500 flex flex-col items-center justify-center gap-4 overflow-hidden",
          isDragging
            ? "border-emerald-500 bg-emerald-50/50 scale-[1.02]"
            : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50",
          hasFiles ? "py-8" : "py-20",
        )}
      >
        <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <input
          id="file-input"
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileInput}
        />

        <motion.div
          animate={isDragging ? { y: [0, -10, 0] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
            isDragging
              ? "bg-emerald-500 text-white rotate-12"
              : "bg-white text-slate-400 group-hover:text-emerald-500 group-hover:shadow-md",
          )}
        >
          <Upload className="w-10 h-10" />
        </motion.div>

        <div className="text-center relative z-10">
          <h3 className="text-xl font-bold text-slate-900 mb-1">
            {hasFiles ? "Add more images" : "Optimize your images"}
          </h3>
          <p className="text-slate-500 max-w-xs mx-auto">
            Drag and drop multiple images or click to browse. Supports JPG, PNG,
            WebP.
          </p>
        </div>

        {!hasFiles && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {["WebP", "AVIF", "PNG", "JPG"].map((ext) => (
              <span
                key={ext}
                className="px-3 py-1 bg-white border border-slate-100 text-slate-400 text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm"
              >
                {ext}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
