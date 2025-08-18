import styles from "./registration.module.css";
import Image from "next/image";
import { reviews } from "./reviews";

export function MobileViewHandler() {
  return (
    <div className="md:hidden px-8 pt-24">
      <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-indigo-600 dark:text-white">
        Speed That Wins Rankings, Retains Visitors.
      </h1>
      <p className="mt-4 text-base text-gray-600 dark:text-gray-300">
        We fix what&apos;s slowing your site down and show you exactly how real
        users experience it. Faster load times, better SEO, and happy visitors —
        no guesswork.
      </p>
      <div className="w-full py-6 mt-6">
        <h3 className="text-md font-semibold text-center mb-4">
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
