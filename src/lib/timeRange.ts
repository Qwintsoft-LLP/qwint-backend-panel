export type Range = "1d" | "7d" | "30d";

export function getRange(range: Range) {
  const to = new Date();
  const from = new Date();
  const days = range === "1d" ? 1 : range === "7d" ? 7 : 30;
  from.setDate(from.getDate() - days);
  return {
    fromTimestamp: from.toISOString(),
    toTimestamp: to.toISOString(),
  };
}
