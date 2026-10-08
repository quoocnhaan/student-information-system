/** API offsets count code points; JS string slices count UTF-16 code units. */
export function LiteralHighlight({ text, occurrences }: { text: string; occurrences: { start: number; end: number }[] }) {
  const points = Array.from(text);
  const ranges: { start: number; end: number }[] = [];
  for (const range of [...occurrences].sort((a, b) => a.start - b.start)) {
    const previous = ranges.at(-1);
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else ranges.push({ ...range });
  }
  let cursor = 0;
  const parts = ranges.map((range) => {
    const before = points.slice(cursor, range.start).join("");
    cursor = range.end;
    return <span key={`${range.start}:${range.end}`}>{before}<mark>{points.slice(range.start, range.end).join("")}</mark></span>;
  });
  return <>{parts}{points.slice(cursor).join("")}</>;
}
