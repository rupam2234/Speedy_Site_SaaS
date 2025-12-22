"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { FeatureCore } from "./homepage";

interface Props {
  feature: FeatureCore;
  reversed?: boolean;
}

export default function FeatureBlock({ feature, reversed = false }: Props) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    margin: "-20% 0px -5% 0px",
    once: false,
  });

  return (
    <div
      ref={ref}
      className={`flex flex-col md:flex-row items-center gap-12 ${
        reversed ? "md:flex-row-reverse" : ""
      }`}
    >
      {/* Image Animation */}
      <motion.div
        initial={{ opacity: 0, x: reversed ? 100 : -100 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="flex-1"
      >
        {feature.image && (
          <img
            src={feature.image}
            alt={feature.title}
            className="w-auto h-auto rounded-sm shadow"
            fetchPriority="high"
          />
        )}
      </motion.div>

      {/* Text Animation */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1"
      >
        <h3 className="text-2xl font-bold text-gray-900">{feature.title}</h3>
        <div className="mt-4">{feature.desc}</div>
      </motion.div>
    </div>
  );
}
