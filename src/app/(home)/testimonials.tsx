"use client";

import { useIsMobile } from "@/components/theme";
import { Link2Icon } from "lucide-react";
import { useState } from "react";

interface Experience {
  name: string;
  role: string;
  business?: string;
  link?: string;
  feedback: string;
}

const testimonials: Experience[] = [
  {
    name: "Stu",
    role: "Business Owner",
    link: "https://www.trustpilot.com/reviews/6785659cd27865a5a711213c",
    feedback:
      "They could have abandoned or given up on my site so many times, but they stuck with me and are dedicated to getting it to pass on mobile and desktop. For a while, desktop was passing but mobile was not. They were diligent in seeing it through and rectifying issues until it passed.",
  },
  {
    name: "Anastasia",
    role: "Business Owner",
    link: "https://www.trustpilot.com/reviews/61017e78f9f48709d4c18766",
    feedback:
      "Speedy.Site's service was a great experience as a customer - they replied to my emails quickly and suggested several fixes on my site which I never thought about that they could be slowing down my site. They did everything to get the best results possible for my site.",
  },
  {
    name: "Robert Selby",
    role: "Business Owner",
    link: "https://www.trustpilot.com/reviews/60c8d908f9f4870a44d56e91",
    feedback:
      "Live up to their name, super fast! Speedy tuned up my aged WordPress site and now has it running lightning fast. Quickness extends to their customer support who are very responsive and timely. Overall, a great value.",
  },
  {
    name: "Mark Matyanowski",
    role: "Business Owner",
    business: "https://matchbuilt.com",
    feedback:
      "When our site needed a speed boost, and Core Web Vitals improved, we gave Speedy Site a try.  In a few short days, they knocked it out with huge improvements in all categories.  Happy to say that we’re now in the green on both desktop and mobile.",
  },
  {
    name: "Frank",
    role: "Business Owner",
    business: "https://homeairadvisor.com",
    feedback:
      "I’ve tried to fix my Core Web Vitals myself but in the end, I only made small improvements that didn’t cut it. That’s when I asked Speedy.Site for help and WOW, they really fixed it both for desktop and mobile!. Extremely fast delivery, great communication and a very friendly price.",
  },
];

export default function Testimonials() {
  const visibleCards = 3;
  const maxSlide = testimonials.length - visibleCards + 1;
  const [selectedPair, setSelectedPair] = useState(1);

  const isMobile = useIsMobile();

  function handleSlider(value: number) {
    if (value > maxSlide) return maxSlide;
    if (value < 1) return 1;
    return value;
  }

  function right() {
    setSelectedPair((prev) => handleSlider(prev + 1));
  }

  function left() {
    setSelectedPair((prev) => handleSlider(prev - 1));
  }

  return (
    <div className="max-w-7xl mx-auto px-6 text-center">
      <div className="flex items-center gap-10">
        {isMobile ? (
          <></>
        ) : (
          <>
            <button
              onClick={left}
              className="rounded-full px-5 py-3 hover:bg-primary/30 cursor-pointer mt-10 bg-primary/10"
            >
              Prev
            </button>
            <div className="overflow-hidden w-full mt-12 h-96">
              <div
                className="flex transition-transform duration-500 gap-8"
                style={{
                  width: `${(testimonials.length / visibleCards) * 100}%`,
                  transform: `translateX(-${(selectedPair - 1) * (100 / testimonials.length)}%)`,
                }}
              >
                {testimonials.map((t, idx) => (
                  <div
                    key={idx}
                    className="relative bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col items-start text-left w-1/3"
                  >
                    <div className="flex items-center mb-4">
                      {Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <svg
                            key={i}
                            className="w-4 h-4 text-green-500 mr-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.955L10 0l2.951 5.955 6.561.955-4.756 4.635 1.122 6.545z" />
                          </svg>
                        ))}
                    </div>
                    <div className="absolute top-5 right-5">
                      {t.link ? (
                        <Link2Icon
                          size={18}
                          className="text-primary/60 hover:text-primary cursor-pointer"
                          onClick={() => window.open(t.link, "_blank")}
                        />
                      ) : t.business ? (
                        <Link2Icon
                          size={18}
                          className="text-primary/60 hover:text-primary cursor-pointer"
                          onClick={() => window.open(t.business, "_blank")}
                        />
                      ) : (
                        <></>
                      )}
                    </div>

                    <p className="text-gray-700 italic">“{t.feedback}”</p>
                    <div className="mt-4">
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <p className="text-sm text-gray-500">{t.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={right}
              className="rounded-full px-5 py-3 hover:bg-primary/30 cursor-pointer mt-10 bg-primary/10"
            >
              Next
            </button>
          </>
        )}
      </div>

      {/* <div className="mt-12">
        <a
          href="/reviews"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-green-500 text-white px-6 py-3 rounded-full font-semibold shadow hover:bg-green-600 transition"
        >
          {isMobile ? <>Read Reviews</> : <>Read More Reviews</>}
        </a>
      </div> */}
    </div>
  );
}
