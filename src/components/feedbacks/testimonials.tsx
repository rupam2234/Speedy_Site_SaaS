"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const testimonials = [
  {
    name: "Kelan Kline",
    website: "thesavvycouple.com",
    image: "/images/testimonials/Kelan-Kline-300x265-1-150x150.webp",
    headline: "Blown away by the results",
    message:
      "I was frustrated trying to speed up our site and pass Core Web Vitals. I can honestly say I am blown away by the results and the professionalism. Our site has never felt so fast.",
  },
  {
    name: "Lindsay Smith",
    website: "nursingschoolsnearme.com",
    image: "/images/testimonials/lindsay-150x150-1.webp",
    headline: "Completed in hours",
    message:
      "Easy to sign up and improvements were completed in hours. We were most impressed with how the team took the time to answer our follow-up questions thoroughly.",
  },
  {
    name: "Shawna Newman",
    website: "skipblast.com",
    image: "/images/testimonials/authir.webp",
    headline: "Great result delivered",
    message:
      "I was really skeptical that Speedy Site could live up to their guarantee of all green Core Web Vitals. After seeing the result, I am truly blown away by what they accomplished.",
  },
  {
    name: "James Walcott",
    website: "walcottmedia.co",
    image: "https://i.pravatar.cc/150?u=3",
    headline: "Immediate ROI boost",
    message:
      "After the optimization, our bounce rate dropped by 30% almost overnight. Fast sites sell better, and this is the only team I trust with our WordPress infrastructure.",
  },
  {
    name: "Marcus Thorne",
    website: "thorne-media.io",
    image: "https://i.pravatar.cc/150?u=4",
    headline: "Surgical Precision",
    message:
      "They didn't just install a plugin; they fixed render-blocking issues at the core level. My site is now lightning fast without a single pixel of design breakage.",
  },
  {
    name: "Elena Rossi",
    website: "rossidesign.co",
    image: "https://i.pravatar.cc/150?u=5",
    headline: "Passed CWV with ease",
    message:
      "Highly recommend if you want to improve site speed without the hassle of trying to figure it out yourself. The team is professional and the results are undeniable.",
  },
];

export default function ServiceTestimonials() {
  return (
    <section className="pb-30 pt-10 bg-[#0a0a0c] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Simplified Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white tracking-tight">
            Trusted by <span className="text-indigo-500">Site Owners</span> Like
            You
          </h2>
          <p className="text-slate-400 font-light max-w-2xl mx-auto">
            We’ve helped over 150+ WordPress sites boost their speed and fix
            Core Web Vitals.
          </p>
        </div>

        {/* Stable 6-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="relative p-7 rounded-2xl bg-white/3 border border-white/5 hover:border-indigo-500/30 transition-all group overflow-hidden flex flex-col justify-between"
            >
              {/* Clean Quote Icon - No heavy layers */}
              {/* <Quote className="absolute top-4 right-4 w-10 h-10 text-white/3 group-hover:text-indigo-500/10 transition-colors pointer-events-none" /> */}

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Image
                    src={t.image}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover border border-white/10"
                    width={0}
                    height={0}
                  />
                  <div>
                    <h4 className="font-bold text-white text-sm leading-tight">
                      {t.name}
                    </h4>
                    <a
                      href={`https://${t.website}`}
                      target="_blank"
                      rel="nofollow"
                      className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {t.website}
                    </a>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    &quot;{t.headline}&quot;
                  </h5>
                  <p className="text-sm text-slate-400 leading-relaxed font-light italic opacity-80 group-hover:opacity-100 transition-opacity">
                    {t.message}
                  </p>
                </div>
              </div>

              {/* Bottom Accent Line - Fixed Syntax */}
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-linear-to-r from-blue-500 to-indigo-500 group-hover:w-full transition-all duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
