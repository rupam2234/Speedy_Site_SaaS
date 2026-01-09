"use client";

import { useState } from "react";

export type ImageExtension =
  | "jpg"
  | "jpeg"
  | "png"
  | "webp"
  | "avif"
  | "gif"
  | "svg"
  | "ico";

export interface ImageExtensionSelectorProps {
  value: ImageExtension[];
  onChange: (value: ImageExtension[]) => void;
}

export const IMAGE_EXTENSIONS: ImageExtension[] = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "svg",
  "ico",
];

export default function ImageExtensionSelector({
  value,
  onChange,
}: ImageExtensionSelectorProps) {
  const [query, setQuery] = useState<string>("");

  const filtered = IMAGE_EXTENSIONS.filter(
    (ext) => ext.includes(query) && !value.includes(ext),
  );

  const addExtension = (ext: ImageExtension) => {
    onChange([...value, ext]);
    setQuery("");
  };

  const removeExtension = (ext: ImageExtension) => {
    onChange(value.filter((e) => e !== ext));
  };

  return (
    <div className="w-full border border-primary/10 bg-primary/5 rounded-sm px-2 py-1">
      <div className="flex flex-wrap gap-1 mb-1">
        {value.map((ext) => (
          <span
            key={ext}
            className="flex items-center gap-1 text-[11px] bg-primary/10 px-2 py-[2px] rounded"
          >
            {ext}
            <button
              type="button"
              onClick={() => removeExtension(ext)}
              className="text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      {/* Search input */}
      <input
        type="text"
        value={query}
        onChange={(e) =>
          setQuery(e.target.value.toLowerCase().replace(/[^a-z]/g, ""))
        }
        placeholder="Search image extensions..."
        className="w-full bg-transparent outline-none text-[12px]"
      />

      {/* Dropdown */}
      {query && filtered.length > 0 && (
        <div className="mt-1 max-w-15 border border-primary/10 bg-white rounded-sm max-h-32 overflow-auto">
          {filtered.map((ext) => (
            <div
              key={ext}
              onClick={() => addExtension(ext)}
              className="px-2 py-1 text-[12px] cursor-pointer hover:bg-primary/5"
            >
              {ext}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
