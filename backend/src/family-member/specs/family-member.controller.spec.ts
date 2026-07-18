import { Test, TestingModule } from '@nestjs/testing';
import { FamilyMemberController } from '../family-member.controller';
import { FamilyMemberService } from '../family-member.service';
import { CreateFamilyMemberDto } from '../dto/create-family-member.dto';
import { UpdateFamilyMemberDto } from '../dto/update-family-member.dto';
import { FamilyMemberResponseDto } from '../dto/family-member-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('FamilyMemberController', () => {
  let controller: FamilyMemberController;
  let service: FamilyMemberService;

  const mockFamilyMemberService = {
    createMember: jest.fn(),
    getMembersByFamily: jest.fn(),
    getMemberById: jest.fn(),
    updateMember: jest.fn(),
    deleteMember: jest.fn(),
  };

  const mockMemberResponse: FamilyMemberResponseDto = {
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FamilyMemberController],
      providers: [
        {
          provide: FamilyMemberService,
          useValue: mockFamilyMemberService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FamilyMemberController>(FamilyMemberController);
    service = module.get<FamilyMemberService>(FamilyMemberService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should delegate to FamilyMemberService.createMember and return mapped response', async () => {
      mockFamilyMemberService.createMember.mockResolvedValue(mockMemberResponse);
      const dto: CreateFamilyMemberDto = {
        fullName: 'Jane Doe',
        relationship: 'Spouse',
      };

      const result = await controller.create('family-1', dto);

      expect(service.createMember).toHaveBeenCalledWith('family-1', dto);
      expect(result).toEqual(mockMemberResponse);
    });
  });

  describe('findAll', () => {
    it('should delegate to FamilyMemberService.getMembersByFamily and return mapped response list', async () => {
      mockFamilyMemberService.getMembersByFamily.mockResolvedValue([mockMemberResponse]);

      const result = await controller.findAll('family-1');

      expect(service.getMembersByFamily).toHaveBeenCalledWith('family-1');
      expect(result).toEqual([mockMemberResponse]);
    });
  });

  describe('findOne', () => {
    it('should delegate to FamilyMemberService.getMemberById and return details', async () => {
      mockFamilyMemberService.getMemberById.mockResolvedValue(mockMemberResponse);

      const result = await controller.findOne('family-1', 'member-1');

      expect(service.getMemberById).toHaveBeenCalledWith('family-1', 'member-1');
      expect(result).toEqual(mockMemberResponse);
    });
  });

  describe('update', () => {
    it('should delegate to FamilyMemberService.updateMember and return updated details', async () => {
      mockFamilyMemberService.updateMember.mockResolvedValue(mockMemberResponse);
      const dto: UpdateFamilyMemberDto = { relationship: 'Wife' };

      const result = await controller.update('family-1', 'member-1', dto);

      expect(service.updateMember).toHaveBeenCalledWith('family-1', 'member-1', dto);
      expect(result).toEqual(mockMemberResponse);
    });
  });

  describe('remove', () => {
    it('should delegate to FamilyMemberService.deleteMember', async () => {
      mockFamilyMemberService.deleteMember.mockResolvedValue(undefined);

      await controller.remove('family-1', 'member-1');

      expect(service.deleteMember).toHaveBeenCalledWith('family-1', 'member-1');
    });
  });
});
