import { computeLevenshteinDistance, computeLevenshteinSimilarity } from './string-similarity';

describe('String Similarity Utility', () => {
  describe('computeLevenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(computeLevenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should return correct distance for insertions, deletions, and substitutions', () => {
      expect(computeLevenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(computeLevenshteinDistance('flaw', 'lawn')).toBe(2);
      expect(computeLevenshteinDistance('abc', '')).toBe(3);
      expect(computeLevenshteinDistance('', 'xyz')).toBe(3);
    });
  });

  describe('computeLevenshteinSimilarity', () => {
    it('should return 1.0 for exact matches case-insensitively with spacing', () => {
      expect(computeLevenshteinSimilarity(' Jane Doe ', 'JANE DOE')).toBe(1.0);
    });

    it('should return 1.0 for empty strings', () => {
      expect(computeLevenshteinSimilarity('', '')).toBe(1.0);
      expect(computeLevenshteinSimilarity('   ', '')).toBe(1.0);
    });

    it('should return 0.0 for completely different strings', () => {
      expect(computeLevenshteinSimilarity('abc', 'xyz')).toBe(0.0);
    });

    it('should return correct decimal similarity score', () => {
      // similarity between "Jane Doe" (len 8) and "John Doe" (len 8): distance 3 (a->o, n->h, e->n)
      // score: 1.0 - (3 / 8) = 0.625
      expect(computeLevenshteinSimilarity('Jane Doe', 'John Doe')).toBe(0.625);

      // similarity between "Jane Doe" (len 8) and "Jana Doe" (len 8): distance 1 (e->a)
      // score: 1.0 - (1 / 8) = 0.875
      expect(computeLevenshteinSimilarity('Jane Doe', 'Jana Doe')).toBe(0.875);

      // similarity between "Aadhaar Card" (len 12) and "Aadhar Card" (len 11)
      // distance: 1 (deleting 'a' from Aadhaar)
      // score: 1.0 - (1 / 12) = 0.916...
      expect(computeLevenshteinSimilarity('Aadhaar Card', 'Aadhar Card')).toBeCloseTo(11 / 12, 3);
    });
  });
});
