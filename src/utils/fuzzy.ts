/**
 * Fuzzy search utility for matching app names.
 * Supports substring, prefix, and fuzzy character matching.
 */

export interface SearchResult<T> {
  item: T;
  score: number;
}

/**
 * Simple fuzzy match: returns a score (higher = better match) or -1 if no match.
 * Matching strategy:
 * 1. Exact match: 100
 * 2. Prefix match: 80
 * 3. Contains match: 50
 * 4. Fuzzy character sequence match: 30
 */
export function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 50;

  // Fuzzy: check if all characters of query appear in order in target
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length ? 30 : -1;
}

/**
 * Search and sort an array of items by fuzzy matching against a query string.
 */
export function fuzzySearch<T>(
  query: string,
  items: T[],
  getSearchableText: (item: T) => string,
): SearchResult<T>[] {
  if (!query.trim()) return [];

  const results: SearchResult<T>[] = [];
  for (const item of items) {
    const text = getSearchableText(item);
    const score = fuzzyMatch(query, text);
    if (score >= 0) {
      results.push({ item, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
