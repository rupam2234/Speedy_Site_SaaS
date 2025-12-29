import { useState } from "react";

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
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase()),
  );

  console.log(selected);

  return (
    <div className="relative w-64">
      <button
        onClick={() => setOpen(!open)}
        className="w-full border border-gray-500/20 bg-gray-500/10 cursor-pointer dark:bg-secondary-background px-4 py-[10px] text-left font-medium text-sm rounded-sm"
      >
        {selected || "Select optimization"}
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
  );
}
