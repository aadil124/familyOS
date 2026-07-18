import { Test, TestingModule } from '@nestjs/testing';
import { FamilyService } from '../family.service';
import { FamilyRepository } from '../family.repository';
import { NotFoundException } from '@nestjs/common';
import { Family } from '@prisma/client';

describe('FamilyService', () => {
  let service: FamilyService;
  let repository: FamilyRepository;

  const mockFamilyRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        {
          provide: FamilyRepository,
          useValue: mockFamilyRepository,
        },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
    repository = module.get<FamilyRepository>(FamilyRepository);

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

  describe('createFamily', () => {
    it('should successfully create a family workspace and return mapped DTO', async () => {
      mockFamilyRepository.create.mockResolvedValue(mockFamily);

      const result = await service.createFamily('user-1', 'Smith Family');

      expect(mockFamilyRepository.create).toHaveBeenCalledWith({
        ownerUserId: 'user-1',
        name: 'Smith Family',
        status: 'active',
      });
      expect(result).toEqual({
        id: mockFamily.id,
        ownerUserId: mockFamily.ownerUserId,
        name: mockFamily.name,
        createdAt: mockFamily.createdAt,
        updatedAt: mockFamily.updatedAt,
      });
    });
  });

  describe('getFamilyById', () => {
    it('should return family response DTO if family exists and is active', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);

      const result = await service.getFamilyById('family-1');

      expect(mockFamilyRepository.findById).toHaveBeenCalledWith('family-1');
      expect(result).toEqual({
        id: mockFamily.id,
        ownerUserId: mockFamily.ownerUserId,
        name: mockFamily.name,
        createdAt: mockFamily.createdAt,
        updatedAt: mockFamily.updatedAt,
      });
    });

    it('should throw NotFoundException if family does not exist in persistence', async () => {
      mockFamilyRepository.findById.mockResolvedValue(null);

      await expect(service.getFamilyById('family-nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if family is soft-deleted (deletedAt is not null)', async () => {
      const deletedFamily = { ...mockFamily, deletedAt: new Date() };
      mockFamilyRepository.findById.mockResolvedValue(deletedFamily);

      await expect(service.getFamilyById('family-deleted')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFamiliesByOwner', () => {
    it('should query active families owned by user using generic findMany method', async () => {
      mockFamilyRepository.findMany.mockResolvedValue([mockFamily]);

      const result = await service.getFamiliesByOwner('user-1');

      expect(mockFamilyRepository.findMany).toHaveBeenCalledWith({
        where: {
          ownerUserId: 'user-1',
          deletedAt: null,
        },
      });
      expect(result).toEqual([
        {
          id: mockFamily.id,
          ownerUserId: mockFamily.ownerUserId,
          name: mockFamily.name,
          createdAt: mockFamily.createdAt,
          updatedAt: mockFamily.updatedAt,
        },
      ]);
    });
  });

  describe('updateFamily', () => {
    it('should update and return family response DTO if active family exists', async () => {
      const updatedFamily = { ...mockFamily, name: 'Smiths' };
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockFamilyRepository.update.mockResolvedValue(updatedFamily);

      const result = await service.updateFamily('family-1', { name: 'Smiths' });

      expect(mockFamilyRepository.update).toHaveBeenCalledWith('family-1', { name: 'Smiths' });
      expect(result.name).toBe('Smiths');
    });

    it('should throw NotFoundException when trying to update a soft-deleted family', async () => {
      const deletedFamily = { ...mockFamily, deletedAt: new Date() };
      mockFamilyRepository.findById.mockResolvedValue(deletedFamily);

      await expect(service.updateFamily('family-1', { name: 'Smiths' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockFamilyRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteFamily', () => {
    it('should call softDelete repository method if active family exists', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockFamilyRepository.softDelete.mockResolvedValue({ ...mockFamily, deletedAt: new Date() });

      await service.deleteFamily('family-1');

      expect(mockFamilyRepository.softDelete).toHaveBeenCalledWith('family-1');
    });

    it('should throw NotFoundException when trying to delete a family that is already soft-deleted', async () => {
      const deletedFamily = { ...mockFamily, deletedAt: new Date() };
      mockFamilyRepository.findById.mockResolvedValue(deletedFamily);

      await expect(service.deleteFamily('family-1')).rejects.toThrow(NotFoundException);
      expect(mockFamilyRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
