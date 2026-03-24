type Status = "Passing" | "Failing" | "Needs improvement" | "Empty data";

const statusColors: Record<Status, { border: string; bg: string }> = {
  Passing: { border: "border-green-300", bg: "bg-green-300/10" },
  Failing: { border: "border-red-300", bg: "bg-red-300/10" },
  "Needs improvement": { border: "border-yellow-300", bg: "bg-yellow-300/10" },
  "Empty data": { border: "border-gray-300/30", bg: "bg-gray-300/10" },
};

export function getStatusColor({ status }: { status: Status }) {
  return statusColors[status];
}
