import React from "react";

export const LoadingAnimation = () => {
  return (
    <div className="flex flex-col w-full min-h-full items-center justify-center font-sans">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

          @keyframes square-reveal {
            0%, 100% {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1);
              opacity: 1;
            }
          }

          .animate-border-spin {
            animation: borderSpin 2s linear infinite;
          }

          .square-item {
            width: 15px;
            height: 15px;
            background-color: #6366f1;
            margin:2px;
            animation: square-reveal 1.5s infinite ease-in-out;
            border-radius: 2px;
          }

          .square-item:nth-child(1) { animation-delay: 0s; }
          .square-item:nth-child(2) { animation-delay: 0.15s; }
          .square-item:nth-child(3) { animation-delay: 0.30s; }
          .square-item:nth-child(4) { animation-delay: 0.45s; }
          .square-item:nth-child(5) { animation-delay: 0.60s; }
        `}
      </style>

      {/* Animated squares below icon */}
      <div className="flex mt-6">
        <div className="square-item"></div>
        <div className="square-item"></div>
        <div className="square-item"></div>
        <div className="square-item"></div>
        <div className="square-item"></div>
      </div>
    </div>
  );
};
