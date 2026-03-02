"use client";

export const LoadingAnimation = () => {
  return (
    <div className="flex items-center justify-center w-full min-h-full">
      <div className="relative flex items-center justify-center">
        {/* Inner core */}
        <div className="absolute w-12 h-12 bg-green-500 rounded-full opacity-20 animate-ping" />

        {/* Glass ring */}
        <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-green-500 animate-spin backdrop-blur-sm shadow-xl" />

        {/* Subtle center dot */}
        <div className="absolute w-2 h-2 bg-green-500 rounded-full" />
      </div>
    </div>
  );
};
