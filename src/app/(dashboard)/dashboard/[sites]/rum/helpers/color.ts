export function getWebVitalColor(metric: string, value: number): string {
  const colors = {
    good: "text-green-600",
    needsImprovement: "text-yellow-600",
    poor: "text-red-600",
  };

  switch (metric) {
    case "fcp":
      return value <= 1800
        ? colors.good
        : value <= 3000
        ? colors.needsImprovement
        : colors.poor;
    case "lcp":
      return value <= 2500
        ? colors.good
        : value <= 4000
        ? colors.needsImprovement
        : colors.poor;
    case "cls":
      return value <= 0.1
        ? colors.good
        : value <= 0.25
        ? colors.needsImprovement
        : colors.poor;
    case "ttfb":
      return value <= 800
        ? colors.good
        : value <= 1800
        ? colors.needsImprovement
        : colors.poor;
    case "inp":
      return value <= 200
        ? colors.good
        : value <= 500
        ? colors.needsImprovement
        : colors.poor;
    default:
      return "";
  }
}
