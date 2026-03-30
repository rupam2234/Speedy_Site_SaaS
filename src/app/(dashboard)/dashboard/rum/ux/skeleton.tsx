import { Loader2 } from "lucide-react";

export function UxLoadingSkeleton() {
  return (
    <div className="w-full px-4 md:px-0 space-y-6 animate-pulse">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-primary/10 rounded" />
          <div className="h-3 w-40 bg-primary/10 rounded" />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="h-10 w-56 bg-primary/10 rounded" />
          <div className="h-10 w-40 bg-primary/10 rounded" />
          <div className="h-10 w-32 bg-primary/10 rounded" />
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* MAP */}
        <div className="order-1 lg:order-2 lg:col-span-5 relative flex flex-col rounded-xl border border-primary/10 bg-primary/5 overflow-hidden">
          {/* Top badges */}
          <div className="absolute top-3 left-3 h-8 w-8 bg-primary/10 rounded-full" />
          <div className="absolute top-3 right-3 h-8 w-64 bg-primary/10 rounded-full hidden md:block" />

          {/* Map area */}
          <div className="mt-10 w-full min-h-125 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary/20" size={40} />
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-3">
            <div className="h-3 w-72 bg-primary/10 rounded" />
          </div>
        </div>

        {/* SIDE PANEL */}
        <div className="order-2 lg:order-1 lg:col-span-2 border border-primary/10 rounded-xl p-5 bg-primary/5 flex flex-col gap-6">
          {/* Sessions */}
          <div className="p-3 rounded-lg bg-background/50 border border-primary/10 space-y-2">
            <div className="h-3 w-24 bg-primary/10 rounded" />
            <div className="h-6 w-32 bg-primary/10 rounded" />
          </div>

          {/* Regions list */}
          <div className="space-y-3">
            <div className="h-3 w-32 bg-primary/10 rounded" />

            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-3 rounded-md bg-background/40 border border-primary/5 space-y-2"
              >
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-primary/10 rounded" />
                  <div className="h-3 w-10 bg-primary/10 rounded" />
                </div>
                <div className="h-1.5 w-full bg-primary/10 rounded" />
                <div className="flex justify-between">
                  <div className="h-3 w-16 bg-primary/10 rounded" />
                  <div className="h-3 w-12 bg-primary/10 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="mt-auto p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="h-3 w-full bg-primary/10 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
