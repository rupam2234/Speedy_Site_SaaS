import { useState } from "react";
import HTMLcache from "./cacheHtml";
import { GaugeCircleIcon } from "lucide-react";

const options = [
  "Cache HTML",
  "Bypass Admin",
  "API Cache",
  "Strip Query Params",
  "Logged-in Bypass",
];

export default function SetupContainer() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>("Cache HTML");

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <div className="relative w-64">
        <button
          onClick={() => setOpen(!open)}
          className="w-full border text-primary/80 flex items-center justify-between border-gray-500/20 bg-gray-500/10 cursor-pointer dark:bg-secondary-background px-4 py-[10px] text-left font-medium text-sm rounded-sm"
        >
          {selected || "Select optimization"}
          <GaugeCircleIcon size={16} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute px-2 py-2 z-10 mt-1 w-full text-sm font-medium rounded-sm border border-gray-500/20 bg-white dark:bg-secondary-background shadow">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full p-2 border-b border-gray-500/20 bg-transparent outline-none text-primary/80"
            />

            <ul className="max-h-48 overflow-auto">
              {filtered.map((opt) => (
                <li
                  key={opt}
                  onClick={() => {
                    setSelected(opt);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="cursor-pointer px-2 py-1 hover:bg-gray-500/10"
                >
                  {opt}
                </li>
              ))}

              {filtered.length === 0 && (
                <li className="px-2 py-2 text-sm text-gray-400">No results</li>
              )}
            </ul>
          </div>
        )}
      </div>
      <div className="grid mt-7 md:grid-cols-7 grid-cols-1 gap-4">
        <div className="col-span-5 p-4 border rounded-sm bg-primary-foreground dark:bg-secondary-background border-primary/10 text-primary/80 space-y-4">
          {selected === "Cache HTML" ? <HTMLcache /> : <></>}
        </div>
        <div className="col-span-2 bg-primary/5 p-4 border rounded-sm text-sm">
          <div className="flex items-center justify-between gap-2">
            <p>HTML CACHE</p>
            <div className="rounded-2xl bg-green-300 border-green-400 border text-primary/80 dark:text-primary-foreground/80 text-[12px] px-2 py-1">
              Active
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
