"use client";

import React from "react";
import { ScaleLoader } from "react-spinners";

export const LoadingAnimation = () => {
  const loading: boolean = true;
  const color: string = "green";

  return (
    <div className="sweet-loading flex items-center justify-center w-full h-screen">
      <ScaleLoader
        color={color}
        loading={loading}
        aria-label="Loading Spinner"
        data-testid="loader"
      />
    </div>
  );
};
