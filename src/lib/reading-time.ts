/**
 * Compute a rough estimated reading time for a piece of content.
 * Counts words in plain strings and in the text content of rendered
 * Markdoc/Astro component trees (works for arrays, objects, elements).
 */
export function estimateReadingTimeMinutes(content: unknown): number {
  const wordCount = countWords(content);
  // 210 words per minute is a common average for technical prose
  const minutes = Math.ceil(wordCount / 210);
  return Math.max(1, minutes);
}

function countWords(content: unknown): number {
  if (content == null || content === false) return 0;
  if (typeof content === "string") {
    return content.split(/\s+/).filter(Boolean).length;
  }
  if (Array.isArray(content)) {
    return content.reduce<number>((sum, item) => sum + countWords(item), 0);
  }
  if (typeof content === "object") {
    const record = content as Record<string, unknown>;
    // rendered Markdoc elements keep their text in `children`
    const child = record.children ?? record.props?.children;
    return countWords(child);
  }
  return 0;
}
