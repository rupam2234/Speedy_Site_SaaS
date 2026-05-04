"use client";

export const LoadingAnimation = () => {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-emerald-500 border-solid mb-4" />
      <p className="text-neutral-500">Loading...</p>
    </div>
  );
};
