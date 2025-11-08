import { useEffect, useState } from "react";
import { useSiteContext } from "../../../siteContext";

interface LLMTrafficSourceProps {
  activeDevice: string;
  originalTrafficData: any[];
}

const llm_sources = [
  "chatgpt",
  "chat.openai.com",
  "openai.com",
  "perplexity.ai",
  "gemini.google.com",
  "bard.google.com",
  "claude.ai",
  "grok.x.ai",
  "bing.com/chat",
  "bing.com/copilotsearch",
  "copilot.microsoft.com",
  "kimi.moonshot.cn",
  "poe.com",
  "cohere.com",
  "anthropic.com",
  "phind.com",
  "you.com",
  "neeva.com",
  "x.ai",
  "huggingface.co",
  "mistral.ai",
  "reka.ai",
  "ora.sh",
  "tabnine.com",
  "deepmind.com",
  "meta.ai",
  "llama.meta.com",
  "ai21.com",
  "cognition.labs",
];

export default function LLMTrafficSource({
  activeDevice,
  originalTrafficData,
}: LLMTrafficSourceProps) {
  const { selectedSite } = useSiteContext();
  const [llmTrafficData, setllmTrafficData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemPerPage = 7;

  useEffect(() => {
    if (!originalTrafficData?.length) return;

    const filtered =
      activeDevice.toLowerCase() !== "all"
        ? originalTrafficData.filter(
            (x) => x.device_type.toLowerCase() === activeDevice.toLowerCase()
          )
        : originalTrafficData;

    const llmFiltered = filtered.filter((item: any) =>
      llm_sources.some((llm) =>
        item.referral_domain?.toLowerCase().includes(llm)
      )
    );

    const aggregatedData = Object.values(
      llmFiltered.reduce((acc: any, curr: any) => {
        const domain = curr.referral_domain;
        if (!acc[domain]) {
          acc[domain] = { ...curr };
        } else {
          acc[domain].count += curr.count;
        }
        return acc;
      }, {})
    );

    aggregatedData.sort((a: any, b: any) => b.count - a.count);

    setllmTrafficData(aggregatedData);
  }, [activeDevice, originalTrafficData, selectedSite]);

  const totalPage = Math.ceil(llmTrafficData.length / itemPerPage);

  const paginatedData =
    llmTrafficData.length > itemPerPage
      ? llmTrafficData.slice(
          (currentPage - 1) * itemPerPage,
          currentPage * itemPerPage
        )
      : llmTrafficData;

  const goToPage = (page: number) => {
    if (page <= 1) {
      page = 1;
    }
    if (page > totalPage) page = totalPage;
    setCurrentPage(page);
  };

  return (
    <div>
      {paginatedData.length > 0 ? (
        <table className="w-full text-sm min-h-fit">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 px-2 font-medium">Referral Domain</th>
              <th className="py-2 px-2 font-medium text-right">Count</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={idx}
                className={
                  idx % 2
                    ? "bg-primary-foreground dark:bg-secondary/20"
                    : undefined
                }
              >
                <td className="py-2 px-2">{row.referral_domain}</td>
                <td className="py-2 px-2 text-right">
                  {row.count >= 1000
                    ? (row.count / 1000).toFixed(1) + "k"
                    : row.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-gray-500">No traffic from LLMs</div>
      )}
      {totalPage > 1 && (
        <div className="absolute top-5/7 right-1 flex justify-end mt-4 space-x-2">
          <button
            className="px-3 py-[2px] border rounded disabled:opacity-50"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          {Array.from({ length: totalPage }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`px-3 py-[2px] border rounded ${
                currentPage === page ? "bg-blue-500 text-white" : ""
              }`}
              onClick={() => goToPage(page)}
            >
              {page}
            </button>
          ))}

          <button
            className="px-3 py-[2px] border rounded disabled:opacity-50"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPage}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
