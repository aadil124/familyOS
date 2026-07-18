/**
 * Computes the Levenshtein distance between two strings.
 */
export function computeLevenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // Deletion
        d[i][j - 1] + 1,      // Insertion
        d[i - 1][j - 1] + cost // Substitution
      );
    }
  }
  
  return d[m][n];
}

/**
 * Computes Levenshtein similarity score between 0.0 and 1.0.
 */
export function computeLevenshteinSimilarity(s1: string, s2: string): number {
  const clean1 = s1.trim().toLowerCase();
  const clean2 = s2.trim().toLowerCase();
  
  if (clean1 === clean2) return 1.0;
  
  const maxLength = Math.max(clean1.length, clean2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = computeLevenshteinDistance(clean1, clean2);
  return 1.0 - distance / maxLength;
}
