export const mockConfigService = {
  get: jest.fn((key: string) => {
    const configMap: Record<string, string | number> = {
      DATABASE_URL: 'postgresql://mock:mock@localhost:5432/mock_db',
      JWT_SECRET: 'mock_secret',
      PORT: 3000,
    };
    return configMap[key];
  }),
};
