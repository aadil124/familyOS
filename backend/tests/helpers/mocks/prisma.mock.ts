export const mockPrismaService: any = {};

mockPrismaService.user = {
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

mockPrismaService.family = {
  findUnique: jest.fn(),
  create: jest.fn(),
};

mockPrismaService.document = {
  findMany: jest.fn(),
  create: jest.fn(),
};

mockPrismaService.$queryRaw = jest.fn();
mockPrismaService.$connect = jest.fn();
mockPrismaService.$disconnect = jest.fn();
mockPrismaService.$transaction = jest.fn((callback: any) =>
  callback(mockPrismaService),
);