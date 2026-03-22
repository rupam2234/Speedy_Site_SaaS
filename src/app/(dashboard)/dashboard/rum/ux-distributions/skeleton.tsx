import { Loader2 } from "lucide-react";

export function UxLoadingSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse px-4 md:px-0">
      <div className="h-16 bg-primary/5 rounded-xl border border-primary/10 flex items-center px-6 justify-between">
        <div className="h-4 w-48 bg-primary/10 rounded" />
        <div className="h-8 w-32 bg-primary/10 rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        <div className="lg:col-span-5 h-125 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary/20" size={40} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="h-24 bg-primary/5 rounded-xl border border-primary/10" />
          <div className="h-64 bg-primary/5 rounded-xl border border-primary/10" />
        </div>
      </div>
    </div>
  );
}
