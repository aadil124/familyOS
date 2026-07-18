import { hashPassword, comparePassword } from './password.util';

describe('Password Utilities', () => {
  const plainPassword = 'mySecurePassword123';

  describe('hashPassword', () => {
    it('should generate a valid bcrypt hash', async () => {
      const hash = await hashPassword(plainPassword);
      expect(hash).toBeDefined();
      expect(hash).not.toEqual(plainPassword);
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    it('should generate different hashes for the same password', async () => {
      const hash1 = await hashPassword(plainPassword);
      const hash2 = await hashPassword(plainPassword);
      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for a matching password and hash', async () => {
      const hash = await hashPassword(plainPassword);
      const isMatch = await comparePassword(plainPassword, hash);
      expect(isMatch).toBe(true);
    });

    it('should return false for a non-matching password and hash', async () => {
      const hash = await hashPassword(plainPassword);
      const isMatch = await comparePassword('wrongPassword', hash);
      expect(isMatch).toBe(false);
    });
  });
});
