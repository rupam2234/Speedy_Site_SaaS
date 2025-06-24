export interface Ranges {
  a: number;
  b: number;
  c: number;
  d: number;
}

export const getRanges = (metric: string) => {
  const rangesMap: { [key: string]: Ranges } = {
    largest_contentful_paint: {
      a: 0,
      b: 2500,
      c: 4000,
      d: 7000,
    },
    interaction_to_next_paint: {
      a: 0,
      b: 200,
      c: 500,
      d: 1000,
    },
    cumulative_layout_shift: {
      a: 0,
      b: 0.1,
      c: 0.25,
      d: 0.5,
    },
    experimental_time_to_first_byte: {
      a: 0,
      b: 800,
      c: 1800,
      d: 5000,
    },
  };

  return rangesMap[metric] || null;
};
