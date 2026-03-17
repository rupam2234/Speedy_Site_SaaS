import React, { useState, useEffect } from "react";
import Image from "next/image";

const AutomatedImageSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = [
    {
      src: "/images/homepage/ux-geo.png",
      alt: "UX-Geographical-Analysis",
    },
    {
      src: "/images/homepage/realtime-vitals.png",
      alt: "Real-time-web-vitals",
    },
    { src: "/images/homepage/cache-hit-miss.webp", alt: "Cache-Efficiency" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="relative w-full mt-12 group">
      <div className="absolute -top-6 left-0 right-0 h-6 bg-slate-200/50 rounded-t-lg flex items-center px-3 gap-1.5 border-2 border-b-0 border-slate-300/40">
        <div className="w-2 h-2 rounded-full bg-slate-300" />
        <div className="w-2 h-2 rounded-full bg-slate-300" />
        <div className="w-2 h-2 rounded-full bg-slate-300" />
      </div>

      <div className="relative overflow-hidden border-2 shadow-xl border-slate-300/40 rounded-b-sm bg-white">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((img, idx) => (
            <div key={idx} className="w-full shrink-0">
              <Image
                src={img.src}
                alt={img.alt}
                width={650}
                height={350}
                layout="responsive"
                priority={idx === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 transition-all duration-300 rounded-full ${
                currentIndex === idx
                  ? "w-6 bg-indigo-600"
                  : "w-1.5 bg-slate-300"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {images[currentIndex].alt.replaceAll("-", " ")}
        </p>
      </div>
    </div>
  );
};

export default AutomatedImageSlider;
