import { Test, TestingModule } from '@nestjs/testing';
import { FamilyRepository } from '../family.repository';
import { PrismaService } from '../../database/prisma.service';
import { Family } from '@prisma/client';

describe('FamilyRepository', () => {
  let repository: FamilyRepository;
  let prisma: PrismaService;

  const mockPrismaService = {
    family: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<FamilyRepository>(FamilyRepository);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const mockFamily: Family = {
    id: 'family-1',
    ownerUserId: 'user-1',
    name: 'Smith Family',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  describe('create', () => {
    it('should call prisma.family.create with correct data', async () => {
      mockPrismaService.family.create.mockResolvedValue(mockFamily);
      const data = { ownerUserId: 'user-1', name: 'Smith Family', status: 'active' };

      const result = await repository.create(data);

      expect(prisma.family.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(mockFamily);
    });
  });

  describe('findById', () => {
    it('should call prisma.family.findUnique with correct id', async () => {
      mockPrismaService.family.findUnique.mockResolvedValue(mockFamily);

      const result = await repository.findById('family-1');

      expect(prisma.family.findUnique).toHaveBeenCalledWith({
        where: { id: 'family-1' },
      });
      expect(result).toEqual(mockFamily);
    });

    it('should return null if family is not found', async () => {
      mockPrismaService.family.findUnique.mockResolvedValue(null);

      const result = await repository.findById('family-nonexistent');

      expect(result).toBeNull();
    });

    it('should return raw database record including soft-deleted files if they exist in DB', async () => {
      const deletedFamily: Family = { ...mockFamily, deletedAt: new Date() };
      mockPrismaService.family.findUnique.mockResolvedValue(deletedFamily);

      const result = await repository.findById('family-deleted');

      expect(prisma.family.findUnique).toHaveBeenCalledWith({
        where: { id: 'family-deleted' },
      });
      expect(result).toEqual(deletedFamily);
    });
  });

  describe('findFirst', () => {
    it('should call prisma.family.findFirst with correct filters', async () => {
      mockPrismaService.family.findFirst.mockResolvedValue(mockFamily);
      const params = { where: { name: 'Smith Family' } };

      const result = await repository.findFirst(params);

      expect(prisma.family.findFirst).toHaveBeenCalledWith({
        where: { name: 'Smith Family' },
      });
      expect(result).toEqual(mockFamily);
    });
  });

  describe('findMany', () => {
    it('should call prisma.family.findMany with correct params', async () => {
      const mockFamilies = [mockFamily];
      mockPrismaService.family.findMany.mockResolvedValue(mockFamilies);
      const params = {
        skip: 0,
        take: 10,
        where: { ownerUserId: 'user-1' },
        orderBy: { createdAt: 'desc' as const },
      };

      const result = await repository.findMany(params);

      expect(prisma.family.findMany).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockFamilies);
    });
  });

  describe('update', () => {
    it('should call prisma.family.update with correct id and data', async () => {
      mockPrismaService.family.update.mockResolvedValue(mockFamily);
      const updateData = { name: 'Updated Name' };

      const result = await repository.update('family-1', updateData);

      expect(prisma.family.update).toHaveBeenCalledWith({
        where: { id: 'family-1' },
        data: updateData,
      });
      expect(result).toEqual(mockFamily);
    });
  });

  describe('softDelete', () => {
    it('should call prisma.family.update with current date for deletedAt and not touch status', async () => {
      const deletedFamily: Family = { ...mockFamily, deletedAt: new Date() };
      mockPrismaService.family.update.mockResolvedValue(deletedFamily);

      const result = await repository.softDelete('family-1');

      expect(prisma.family.update).toHaveBeenCalledWith({
        where: { id: 'family-1' },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(deletedFamily);
    });
  });
});
