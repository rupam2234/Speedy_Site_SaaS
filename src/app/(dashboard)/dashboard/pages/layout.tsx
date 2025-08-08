import { Protect } from "@clerk/nextjs";
import { ReactNode } from "react";

interface LabLayoutProps {
  children: ReactNode;
}

function Fallback() {
  return (
    <div className="flex flex-col items-center justify-center md:h-[80vh] p-6">
      <span className="text-4xl mb-4">🔒</span>
      <h2 className="text-[16px] font-normal text-center text-primary">
        You need at least the pro plan to view lab report.
      </h2>
      <p>
        Please visit <strong>account</strong> {">"} <strong>billing</strong> to
        check your active plan.
      </p>
    </div>
  );
}

export default function LabLayout({ children }: LabLayoutProps) {
  return (
    <Protect plan="pro" fallback={<Fallback />}>
      {children}
    </Protect>
  );
}
