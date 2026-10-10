import { ExternalLink } from "lucide-react";

// Keep these values in sync with the Trustpilot business profile.
const trustpilotConfig = {
  profileUrl: "https://www.trustpilot.com/review/speedy.site",
  score: "4.8",
  label: "Excellent",
  reviewCount: 9,
};

function TrustpilotStars() {
  return (
    <div className="flex items-center">
      {Array(5)
        .fill(0)
        .map((_, i) => (
          <svg
            key={i}
            className="w-6 h-6 text-[#00b67a]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.955L10 0l2.951 5.955 6.561.955-4.756 4.635 1.122 6.545z" />
          </svg>
        ))}
    </div>
  );
}

export default function TrustpilotWidget() {
  return (
    <div className="max-w-3xl mx-auto mb-14">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/50 px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center sm:items-start gap-1.5">
          <div className="flex items-center gap-3">
            <TrustpilotStars />
            <span className="text-2xl font-bold text-slate-900">
              {trustpilotConfig.score}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            <span className="font-bold text-slate-900">
              {trustpilotConfig.label}
            </span>{" "}
            · Based on {trustpilotConfig.reviewCount} reviews on Trustpilot
          </p>
        </div>

        <a
          href={trustpilotConfig.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#00b67a] text-white px-6 py-2.5 text-sm font-bold shadow hover:bg-[#00945d] transition-all active:scale-95"
        >
          Read our reviews
          <ExternalLink size={15} />
        </a>
      </div>
    </div>
  );
}