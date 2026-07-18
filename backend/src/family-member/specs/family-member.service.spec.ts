import { Test, TestingModule } from '@nestjs/testing';
import { FamilyMemberService } from '../family-member.service';
import { FamilyMemberRepository } from '../family-member.repository';
import { FamilyRepository } from '../../family/family.repository';
import { NotFoundException } from '@nestjs/common';
import { FamilyMember, Family } from '@prisma/client';

describe('FamilyMemberService', () => {
  let service: FamilyMemberService;
  let familyMemberRepository: FamilyMemberRepository;
  let familyRepository: FamilyRepository;

  const mockFamilyMemberRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockFamilyRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyMemberService,
        {
          provide: FamilyMemberRepository,
          useValue: mockFamilyMemberRepository,
        },
        {
          provide: FamilyRepository,
          useValue: mockFamilyRepository,
        },
      ],
    }).compile();

    service = module.get<FamilyMemberService>(FamilyMemberService);
    familyMemberRepository = module.get<FamilyMemberRepository>(FamilyMemberRepository);
    familyRepository = module.get<FamilyRepository>(FamilyRepository);

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

  describe('createMember', () => {
    it('should successfully create a member and return mapped DTO if family is active', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockFamilyMemberRepository.create.mockResolvedValue(mockMember);

      const dto = {
        fullName: 'Jane Doe',
        relationship: 'Spouse',
        dateOfBirth: new Date('1990-01-01'),
        primaryEmail: 'jane@example.com',
        primaryPhone: '1234567890',
      };

      const result = await service.createMember('family-1', dto);

      expect(familyRepository.findById).toHaveBeenCalledWith('family-1');
      expect(familyMemberRepository.create).toHaveBeenCalledWith({
        ...dto,
        familyId: 'family-1',
        status: 'active',
      });
      expect(result).toEqual({
        id: mockMember.id,
        familyId: mockMember.familyId,
        fullName: mockMember.fullName,
        relationship: mockMember.relationship,
        dateOfBirth: mockMember.dateOfBirth,
        primaryEmail: mockMember.primaryEmail,
        primaryPhone: mockMember.primaryPhone,
        status: mockMember.status,
        createdAt: mockMember.createdAt,
        updatedAt: mockMember.updatedAt,
      });
    });

    it('should throw NotFoundException if family does not exist', async () => {
      mockFamilyRepository.findById.mockResolvedValue(null);

      await expect(
        service.createMember('family-nonexistent', { fullName: 'Jane Doe' }),
      ).rejects.toThrow(NotFoundException);
      expect(familyMemberRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if family is soft-deleted', async () => {
      mockFamilyRepository.findById.mockResolvedValue({ ...mockFamily, deletedAt: new Date() });

      await expect(
        service.createMember('family-deleted', { fullName: 'Jane Doe' }),
      ).rejects.toThrow(NotFoundException);
      expect(familyMemberRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getMemberById', () => {
    it('should return member response DTO if member is active and belongs to the family', async () => {
      mockFamilyMemberRepository.findById.mockResolvedValue(mockMember);

      const result = await service.getMemberById('family-1', 'member-1');

      expect(familyMemberRepository.findById).toHaveBeenCalledWith('member-1');
      expect(result.fullName).toBe('Jane Doe');
    });

    it('should throw NotFoundException if member belongs to a different family', async () => {
      mockFamilyMemberRepository.findById.mockResolvedValue(mockMember);

      await expect(service.getMemberById('family-different', 'member-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if member is soft-deleted', async () => {
      mockFamilyMemberRepository.findById.mockResolvedValue({ ...mockMember, deletedAt: new Date() });

      await expect(service.getMemberById('family-1', 'member-deleted')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if member does not exist', async () => {
      mockFamilyMemberRepository.findById.mockResolvedValue(null);

      await expect(service.getMemberById('family-1', 'member-nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMembersByFamily', () => {
    it('should return list of mapped active members if family exists and is active', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockFamilyMemberRepository.findMany.mockResolvedValue([mockMember]);

      const result = await service.getMembersByFamily('family-1');

      expect(familyRepository.findById).toHaveBeenCalledWith('family-1');
      expect(familyMemberRepository.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-1',
          deletedAt: null,
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('Jane Doe');
    });

    it('should throw NotFoundException if family does not exist', async () => {
      mockFamilyRepository.findById.mockResolvedValue(null);

      await expect(service.getMembersByFamily('family-nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(familyMemberRepository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('updateMember', () => {
    it('should update member if active member exists and belongs to the family', async () => {
      const updated = { ...mockMember, fullName: 'Jane Smith' };
      mockFamilyMemberRepository.findById.mockResolvedValue(mockMember);
      mockFamilyMemberRepository.update.mockResolvedValue(updated);

      const result = await service.updateMember('family-1', 'member-1', { fullName: 'Jane Smith' });

      expect(familyMemberRepository.update).toHaveBeenCalledWith('member-1', {
        fullName: 'Jane Smith',
      });
      expect(result.fullName).toBe('Jane Smith');
    });

    it('should throw NotFoundException when trying to update a soft-deleted member', async () => {
      const deleted = { ...mockMember, deletedAt: new Date() };
      mockFamilyMemberRepository.findById.mockResolvedValue(deleted);

      await expect(
        service.updateMember('family-1', 'member-1', { fullName: 'Jane Smith' }),
      ).rejects.toThrow(NotFoundException);
      expect(familyMemberRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteMember', () => {
    it('should soft delete member if active member exists and belongs to the family', async () => {
      mockFamilyMemberRepository.findById.mockResolvedValue(mockMember);
      mockFamilyMemberRepository.softDelete.mockResolvedValue({ ...mockMember, deletedAt: new Date() });

      await service.deleteMember('family-1', 'member-1');

      expect(familyMemberRepository.softDelete).toHaveBeenCalledWith('member-1');
    });

    it('should throw NotFoundException when trying to delete a soft-deleted member', async () => {
      const deleted = { ...mockMember, deletedAt: new Date() };
      mockFamilyMemberRepository.findById.mockResolvedValue(deleted);

      await expect(service.deleteMember('family-1', 'member-1')).rejects.toThrow(NotFoundException);
      expect(familyMemberRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
