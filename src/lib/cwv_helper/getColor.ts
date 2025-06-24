const colorRanges: { [key: string]: [number, number, string][] } = {
  largest_contentful_paint: [
    [0, 2500, "text-green-500 dark:text-green-500"],
    [2500, 4000, "text-yellow-500 dark:text-yellow-400"],
    [4000, Infinity, "text-red-500 dark:text-red-400"],
  ],
  interaction_to_next_paint: [
    [0, 200, "text-green-500 dark:text-green-500"],
    [200, 500, "text-yellow-500 dark:text-yellow-400"],
    [500, Infinity, "text-red-500 dark:text-red-400"],
  ],
  cumulative_layout_shift: [
    [0, 0.1, "text-green-500 dark:text-green-500"],
    [0.1, 0.25, "text-yellow-500 dark:text-yellow-400"],
    [0.25, Infinity, "text-red-500 dark:text-red-400"],
  ],
  experimental_time_to_first_byte: [
    [0, 800, "text-green-500 dark:text-green-500"],
    [800, 1800, "text-yellow-500 dark:text-yellow-400"],
    [1800, Infinity, "text-red-500 dark:text-red-400"],
  ],
};

export const getColor = (metricKey: string, value: number): string => {
  const ranges = colorRanges[metricKey];
  if (!ranges || typeof value !== "number") return "text-muted-foreground";

  for (const [min, max, color] of ranges) {
    if (value > min && value <= max) return color;
  }

  return "text-muted-foreground"; // fallback
};
