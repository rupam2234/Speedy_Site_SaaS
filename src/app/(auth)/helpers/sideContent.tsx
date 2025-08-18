import styles from "./registration.module.css";
import Image from "next/image";
import { reviews } from "./reviews";

export function DesktopSideContent() {
  return (
    <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br dark:bg-secondary-background from-indigo-500 to-purple-400 relative px-8 py-12 overflow-hidden">
      <div className="absolute top-10 right-10 w-48 h-48 bg-purple-300 rounded-full opacity-20 blur-2xl" />
      <div className="absolute bottom-10 left-10 w-24 h-24 bg-indigo-200 rounded-full opacity-20 blur-xl" />
      <div className="backdrop-blur-md space-y-7 bg-white/10 dark:bg-black/20 p-10 rounded-md max-w-xl text-white z-10">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
          Speed That Wins Rankings, Retains Visitors.
        </h1>
        <p className="mt-4 text-lg text-indigo-100 dark:text-gray-200 max-w-lg">
          We fix what’s slowing your site down and show you exactly how real
          users experience it. Faster load times, better SEO, and happy visitors
          — no guesswork.
        </p>
      </div>
      <div className="w-full py-8 z-0 mt-6">
        <h3 className="text-md font-semibold text-center text-purple-100 mb-4">
          Trusted by Creators
        </h3>
        <div className={styles.marquee}>
          <div className={styles.marqueeInner}>
            <div className={styles.marqueeGroup}>
              {reviews.map((review, idx) => (
                <div
                  key={idx}
                  className="mx-4 bg-white/90 dark:bg-black/70 text-black dark:text-white rounded-lg shadow-md px-4 py-3 min-w-[220px] max-w-xs"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Image
                      src={review.avatar}
                      alt={review.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-semibold text-sm">{review.name}</span>
                  </div>
                  <p className="text-sm leading-snug italic">{review.text}</p>
                </div>
              ))}
            </div>
            <div className={styles.marqueeGroup}>
              {reviews.map((review, idx) => (
                <div
                  key={idx + reviews.length}
                  className="mx-4 bg-white/90 dark:bg-black/70 text-black dark:text-white rounded-lg shadow-md px-4 py-3 min-w-[220px] max-w-xs"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Image
                      src={review.avatar}
                      alt={review.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-semibold text-sm">{review.name}</span>
                  </div>
                  <p className="text-sm leading-snug italic">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
