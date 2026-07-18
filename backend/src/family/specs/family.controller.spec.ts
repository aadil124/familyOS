import { Test, TestingModule } from '@nestjs/testing';
import { FamilyController } from '../family.controller';
import { FamilyService } from '../family.service';
import { FamilyResponseDto } from '../dto/family-response.dto';
import { CurrentUser } from '../../auth/interfaces/auth.interface';
import { TokenService } from '../../auth/services/token.service';
import { Reflector } from '@nestjs/core';

describe('FamilyController', () => {
  let controller: FamilyController;
  let service: FamilyService;

  const mockFamilyService = {
    createFamily: jest.fn(),
    getFamiliesByOwner: jest.fn(),
    getFamilyById: jest.fn(),
    updateFamily: jest.fn(),
    deleteFamily: jest.fn(),
  };

  const mockTokenService = {
    verifyAccessToken: jest.fn(),
  };

  const mockUser: CurrentUser = {
    userId: 'user-uuid-1',
    email: 'john@example.com',
    role: 'OWNER',
  };

  const mockFamilyResponse: FamilyResponseDto = {
    id: 'family-uuid-1',
    ownerUserId: 'user-uuid-1',
    name: 'Doe Family',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FamilyController],
      providers: [
        {
          provide: FamilyService,
          useValue: mockFamilyService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<FamilyController>(FamilyController);
    service = module.get<FamilyService>(FamilyService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should delegate to FamilyService.createFamily and return family response DTO', async () => {
      mockFamilyService.createFamily.mockResolvedValue(mockFamilyResponse);
      const dto = { name: 'Doe Family' };

      const result = await controller.create(dto, mockUser);

      expect(service.createFamily).toHaveBeenCalledWith(mockUser.userId, dto.name);
      expect(result).toEqual(mockFamilyResponse);
    });
  });

  describe('findAll', () => {
    it('should delegate to FamilyService.getFamiliesByOwner and return list of families', async () => {
      const mockList = [mockFamilyResponse];
      mockFamilyService.getFamiliesByOwner.mockResolvedValue(mockList);

      const result = await controller.findAll(mockUser);

      expect(service.getFamiliesByOwner).toHaveBeenCalledWith(mockUser.userId);
      expect(result).toEqual(mockList);
    });
  });

  describe('findOne', () => {
    it('should delegate to FamilyService.getFamilyById and return family details', async () => {
      mockFamilyService.getFamilyById.mockResolvedValue(mockFamilyResponse);

      const result = await controller.findOne('family-uuid-1');

      expect(service.getFamilyById).toHaveBeenCalledWith('family-uuid-1');
      expect(result).toEqual(mockFamilyResponse);
    });
  });

  describe('update', () => {
    it('should delegate to FamilyService.updateFamily and return updated family details', async () => {
      const updatedResponse = { ...mockFamilyResponse, name: 'Updated Doe Family' };
      mockFamilyService.updateFamily.mockResolvedValue(updatedResponse);
      const dto = { name: 'Updated Doe Family' };

      const result = await controller.update('family-uuid-1', dto);

      expect(service.updateFamily).toHaveBeenCalledWith('family-uuid-1', dto);
      expect(result).toEqual(updatedResponse);
    });
  });

  describe('remove', () => {
    it('should delegate to FamilyService.deleteFamily', async () => {
      mockFamilyService.deleteFamily.mockResolvedValue(undefined);

      await controller.remove('family-uuid-1');

      expect(service.deleteFamily).toHaveBeenCalledWith('family-uuid-1');
    });
  });
});
