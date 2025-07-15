// when no website is selected this will be the fallback page

import { PlusCircle } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
      <PlusCircle className="w-10 h-10 text-muted-foreground mb-4" />
      <h2 className="text-lg font-semibold">Select a website</h2>
      <p className="text-muted-foreground mt-1">
        You haven&apos;t selected a website yet. Please select one to get
        started.
      </p>
    </div>
  );
}
