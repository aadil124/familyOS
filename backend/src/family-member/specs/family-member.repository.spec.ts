import { Test, TestingModule } from '@nestjs/testing';
import { FamilyMemberRepository } from '../family-member.repository';
import { PrismaService } from '../../database/prisma.service';
import { FamilyMember } from '@prisma/client';

describe('FamilyMemberRepository', () => {
  let repository: FamilyMemberRepository;
  let prisma: PrismaService;

  const mockPrismaService = {
    familyMember: {
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
        FamilyMemberRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<FamilyMemberRepository>(FamilyMemberRepository);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const mockMember: FamilyMember = {
    id: 'member-1',
    familyId: 'family-1',
    fullName: 'Jane Doe',
    relationship: 'Spouse',
    dateOfBirth: new Date('1990-01-01'),
    primaryEmail: 'jane@example.com',
    primaryPhone: '1234567890',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  describe('create', () => {
    it('should call prisma.familyMember.create with correct data', async () => {
      mockPrismaService.familyMember.create.mockResolvedValue(mockMember);
      const data = {
        familyId: 'family-1',
        fullName: 'Jane Doe',
        relationship: 'Spouse',
        status: 'active',
      };

      const result = await repository.create(data);

      expect(prisma.familyMember.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(mockMember);
    });
  });

  describe('findById', () => {
    it('should call prisma.familyMember.findUnique with correct id', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMember);

      const result = await repository.findById('member-1');

      expect(prisma.familyMember.findUnique).toHaveBeenCalledWith({
        where: { id: 'member-1' },
      });
      expect(result).toEqual(mockMember);
    });

    it('should return raw database record including soft-deleted files if they exist in DB', async () => {
      const deletedMember: FamilyMember = { ...mockMember, deletedAt: new Date() };
      mockPrismaService.familyMember.findUnique.mockResolvedValue(deletedMember);

      const result = await repository.findById('member-deleted');

      expect(prisma.familyMember.findUnique).toHaveBeenCalledWith({
        where: { id: 'member-deleted' },
      });
      expect(result).toEqual(deletedMember);
    });
  });

  describe('findFirst', () => {
    it('should call prisma.familyMember.findFirst with correct filters', async () => {
      mockPrismaService.familyMember.findFirst.mockResolvedValue(mockMember);
      const params = { where: { fullName: 'Jane Doe' } };

      const result = await repository.findFirst(params);

      expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: { fullName: 'Jane Doe' },
      });
      expect(result).toEqual(mockMember);
    });
  });

  describe('findMany', () => {
    it('should call prisma.familyMember.findMany with correct params', async () => {
      const mockMembers = [mockMember];
      mockPrismaService.familyMember.findMany.mockResolvedValue(mockMembers);
      const params = {
        skip: 0,
        take: 10,
        where: { familyId: 'family-1' },
        orderBy: { createdAt: 'desc' as const },
      };

      const result = await repository.findMany(params);

      expect(prisma.familyMember.findMany).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockMembers);
    });
  });

  describe('update', () => {
    it('should call prisma.familyMember.update with correct id and data', async () => {
      mockPrismaService.familyMember.update.mockResolvedValue(mockMember);
      const updateData = { relationship: 'Wife' };

      const result = await repository.update('member-1', updateData);

      expect(prisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        data: updateData,
      });
      expect(result).toEqual(mockMember);
    });
  });

  describe('softDelete', () => {
    it('should call prisma.familyMember.update with current date for deletedAt and not touch status', async () => {
      const deletedMember: FamilyMember = { ...mockMember, deletedAt: new Date() };
      mockPrismaService.familyMember.update.mockResolvedValue(deletedMember);

      const result = await repository.softDelete('member-1');

      expect(prisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(deletedMember);
    });
  });
});
