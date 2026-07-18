export const mockJwtService = {
  sign: jest.fn().mockReturnValue('mocked_jwt_token'),
  signAsync: jest.fn().mockResolvedValue('mocked_jwt_token'),
  verify: jest.fn().mockReturnValue({ userId: 'mock-user-id' }),
  verifyAsync: jest.fn().mockResolvedValue({ userId: 'mock-user-id' }),
};
