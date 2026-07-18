export const createUserFactory = (overrides = {}) => ({
  id: 'mock-user-id',
  fullName: 'Test User',
  email: 'test@familyos.ai',
  passwordHash: 'hashed_password',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
