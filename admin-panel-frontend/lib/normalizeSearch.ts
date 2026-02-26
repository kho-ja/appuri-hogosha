export function normalizeSearch(input: string): string {
  if (typeof input !== "string") return "";

  // Trim and collapse internal whitespace to keep searches predictable.
  return input.replace(/\s+/g, " ").trim();
}
