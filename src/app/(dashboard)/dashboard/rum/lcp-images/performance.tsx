interface imageMetric {
  avg_transfer_size: number | null;
  avg_decoded_body_size: number | null;
  avg_resource_load_delay: number | null;
  avg_resource_load_duration: number | null;
  avg_element_render_delay: number | null;
  avg_time_to_first_byte: number | null;
  isLazyloaded: boolean;
}

export default function Performancetab({
  avg_transfer_size,
  avg_decoded_body_size,
  avg_resource_load_delay,
  avg_resource_load_duration,
  avg_element_render_delay,
  avg_time_to_first_byte,
  isLazyloaded,
}: imageMetric) {
  const renderDelay = Number(avg_element_render_delay || 0);
  const ttfb = Number(avg_time_to_first_byte || 0);
  const transfer = Number(avg_transfer_size || 0);
  const decoded = Number(avg_decoded_body_size || 0);
  const loadDelay = Number(avg_resource_load_delay || 0);
  const lazyload = Boolean(isLazyloaded);
  const compressionRatio = transfer > 0 ? decoded / transfer : 1;

  const getMetricColor = (key: string, value: number) => {
    switch (key) {
      case "avg_time_to_first_byte":
        return value < 200
          ? "text-green-600"
          : value < 400
          ? "text-yellow-600"
          : "text-red-600";
      case "avg_resource_load_delay":
        return value < 200
          ? "text-green-600"
          : value < 800
          ? "text-yellow-600"
          : "text-red-600";
      case "avg_element_render_delay":
        return value < 2500
          ? "text-green-600"
          : value < 4000
          ? "text-yellow-600"
          : "text-red-600";
      default:
        return "text-foreground";
    }
  };

  // --- scoring --- //
  const scoreTTFB =
    ttfb < 300
      ? 100
      : ttfb < 600
      ? 80
      : ttfb < 1000
      ? 60
      : ttfb < 1500
      ? 40
      : 20;
  const scoreRender =
    renderDelay < 1000
      ? 100
      : renderDelay < 2500
      ? 80
      : renderDelay < 4000
      ? 60
      : 40;
  const scoreDelay =
    loadDelay < 300 ? 100 : loadDelay < 800 ? 80 : loadDelay < 1500 ? 60 : 40;
  const scoreTransfer =
    transfer < 120 * 1024
      ? 100
      : transfer < 250 * 1024
      ? 80
      : transfer < 400 * 1024
      ? 60
      : 40;
  const scoreDecoded =
    decoded < 500 * 1024
      ? 100
      : decoded < 800 * 1024
      ? 80
      : decoded < 1200 * 1024
      ? 60
      : 40;

  const lazyPenalty = lazyload ? 15 : 0;
  const avgScore =
    (scoreTTFB + scoreRender + scoreDelay + scoreTransfer + scoreDecoded) / 5 -
    lazyPenalty;

  let grade;
  if (avgScore >= 85)
    grade = { label: "Good", color: "bg-green-100 text-green-700" };
  else if (avgScore >= 65)
    grade = {
      label: "Needs Improvement",
      color: "bg-yellow-100 text-yellow-700",
    };
  else grade = { label: "Poor", color: "bg-red-100 text-red-700" };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "--";
    if (bytes < 1024) return `${bytes.toFixed(2)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const Metric = ({
    label,
    value,
    color,
  }: {
    label: string;
    value: string;
    color?: string;
  }) => (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-medium ${color}`}>{value}</div>
    </div>
  );

  // --- Per-metric observations --- //
  const observations: string[] = [];

  if (lazyload && renderDelay > 1000)
    observations.push(
      "Your main image loads lazily, which delays how fast it shows up. Try preloading it."
    );
  if (ttfb > 800)
    observations.push(
      "Your server responds slowly — try caching or using a CDN to speed it up."
    );
  if (loadDelay > 800)
    observations.push(
      "The image starts loading late — consider preloading it for faster display."
    );
  if (transfer > 300 * 1024)
    observations.push(
      "The image file is quite large — compress it or use WebP/AVIF format."
    );
  if (decoded > 800 * 1024 || compressionRatio > 4)
    observations.push(
      "The browser has to process a big image — resize or simplify it to load faster."
    );
  if (renderDelay > 2500)
    observations.push(
      "The image appears late — try reducing page scripts and look for possible render blocking reasons."
    );
  if (observations.length === 0)
    observations.push("Image performance looks healthy.");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-primary dark:text-primary/80">
          Status:
        </h3>
        <span
          className={`text-sm font-medium px-2 py-1 rounded ${grade.color}`}
        >
          {grade.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="Transfer Size"
          value={formatFileSize(avg_transfer_size ?? 0)}
        />
        <Metric
          label="Decoded Size"
          value={formatFileSize(avg_decoded_body_size ?? 0)}
        />
        <Metric
          label="Resource Load Delay"
          value={`${((avg_resource_load_delay ?? 0) / 1000).toFixed(2)} s`}
          color={getMetricColor(
            "avg_resource_load_delay",
            avg_resource_load_delay ?? 0
          )}
        />
        <Metric
          label="Resource Load Duration"
          value={`${((avg_resource_load_duration ?? 0) / 1000).toFixed(2)} s`}
        />
        <Metric
          label="Element Render Delay"
          value={`${((avg_element_render_delay ?? 0) / 1000).toFixed(2)} s`}
          color={getMetricColor(
            "avg_element_render_delay",
            avg_element_render_delay ?? 0
          )}
        />
        <Metric
          label="Time to First Byte"
          value={`${avg_time_to_first_byte?.toFixed(0)} ms`}
          color={getMetricColor(
            "avg_time_to_first_byte",
            avg_time_to_first_byte ?? 0
          )}
        />
      </div>

      <div className="mt-3 space-y-2">
        {observations.map((msg, i) => (
          <div
            key={i}
            className="p-2 text-sm rounded-md bg-yellow-50 border-l-4 border-yellow-400 text-gray-700"
          >
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}
