// Example-local values. No Layout or consumer-reference defaults.
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function sampleStory(progress, count = 3) {
  if (!Number.isFinite(progress) || !Number.isInteger(count) || count < 1) {
    throw new TypeError('Expected finite progress and a positive integer scene count');
  }
  const p = clamp(progress);
  const position = p * (count - 1);
  return {
    progress: p,
    active: Math.round(position),
    panels: Array.from({ length: count }, (_, index) => {
      const distance = position - index;
      const weight = clamp(1 - Math.abs(distance));
      // Hold readable copy, then crossfade through the middle of each segment.
      const opacity = clamp((weight - 0.2) / 0.6);
      return { opacity, y: clamp(-distance, -1, 1) * 64, scale: 0.9 + weight * 0.1 };
    }),
  };
}

export function scrollProgress(scroll, start, distance) {
  return distance > 0 ? clamp((scroll - start) / distance) : 0;
}
