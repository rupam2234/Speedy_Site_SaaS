export enum LcpElements {
  font = "a FONT",
  image = "an IMAGE",
}

export type AssetType = "image" | "font";

type MetricByResources = {
  image: number;
  font: number;
};

type LcpSegmentTimings = {
  load_delay: MetricByResources;
  load_duration: MetricByResources;
  render_delay: MetricByResources;
};

export const timings: LcpSegmentTimings = {
  load_delay: {
    image: 150,
    font: 120,
  },
  load_duration: {
    image: 300,
    font: 250,
  },
  render_delay: {
    image: 300,
    font: 200,
  },
};
