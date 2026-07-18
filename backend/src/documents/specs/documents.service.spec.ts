import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from '../documents.service';
import { DocumentsRepository } from '../documents.repository';
import { FamilyRepository } from '../../family/family.repository';
import { FamilyMemberRepository } from '../../family-member/family-member.repository';
import { CloudinaryService } from '../cloudinary.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Document, DocumentCategory, Family, FamilyMember, DocumentProcessingStatus, DocumentReviewStatus } from '@prisma/client';
import { DocumentProcessingDispatcher } from '../../ocr/dispatchers/processing-dispatcher.interface';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentsRepository: DocumentsRepository;
  let familyRepository: FamilyRepository;
  let familyMemberRepository: FamilyMemberRepository;
  let cloudinaryService: CloudinaryService;

  const mockDocumentsRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findCategoryById: jest.fn(),
    findCategoryByKey: jest.fn(),
    createCategory: jest.fn(),
    findManyCategories: jest.fn(),
  };

  const mockFamilyRepository = {
    findById: jest.fn(),
  };

  const mockFamilyMemberRepository = {
    findById: jest.fn(),
  };

  const mockCloudinaryService = {
    generateUploadSignature: jest.fn(),
    generateDownloadUrl: jest.fn(),
    deleteAsset: jest.fn(),
  };

  const mockDispatcher = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: DocumentsRepository,
          useValue: mockDocumentsRepository,
        },
        {
          provide: FamilyRepository,
          useValue: mockFamilyRepository,
        },
        {
          provide: FamilyMemberRepository,
          useValue: mockFamilyMemberRepository,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: DocumentProcessingDispatcher,
          useValue: mockDispatcher,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    documentsRepository = module.get<DocumentsRepository>(DocumentsRepository);
    familyRepository = module.get<FamilyRepository>(FamilyRepository);
    familyMemberRepository = module.get<FamilyMemberRepository>(FamilyMemberRepository);
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);

    jest.clearAllMocks();
  });

  const mockFamily: Family = {
    id: 'family-1',
    ownerUserId: 'user-1',
    name: 'Smith Vault',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockCategory: DocumentCategory = {
    id: 'cat-1',
    name: 'Identity Verification',
    normalizedKey: 'identity',
    description: 'Passports',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember: FamilyMember = {
    id: 'member-1',
    familyId: 'family-1',
    fullName: 'Jane Doe',
    relationship: 'Spouse',
    dateOfBirth: new Date(),
    primaryEmail: 'jane@example.com',
    primaryPhone: '123',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockDoc: Document = {
    id: 'doc-1',
    familyId: 'family-1',
    familyMemberId: 'member-1',
    categoryId: 'cat-1',
    originalFileName: 'passport.pdf',
    displayName: 'My Passport',
    fileType: 'pdf',
    fileSize: 1024,
    storageProvider: 'cloudinary',
    storageAssetId: 'asset-1',
    storageUrlReference: null,
    uploadStatus: 'uploaded',
    processingStatus: DocumentProcessingStatus.PENDING,
    reviewStatus: DocumentReviewStatus.UNREVIEWED,
    issueStatus: null,
    issuedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  describe('getUploadSignature', () => {
    it('should generate signature successfully if user owns family', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockCloudinaryService.generateUploadSignature.mockReturnValue({ signature: 'sig123' });

      const result = await service.getUploadSignature('user-1', 'family-1');
      expect(result).toEqual({ signature: 'sig123' });
    });

    it('should throw NotFoundException if family does not exist', async () => {
      mockFamilyRepository.findById.mockResolvedValue(null);
      await expect(service.getUploadSignature('user-1', 'family-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own family', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      await expect(service.getUploadSignature('user-other', 'family-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('registerDocument', () => {
    const createDto = {
      storageAssetId: 'asset-1',
      originalFileName: 'passport.pdf',
      fileType: 'pdf',
      fileSize: 2048,
      displayName: 'My Passport',
      familyMemberId: 'member-1',
      categoryId: 'cat-1',
    };

    it('should register document successfully', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockFamilyMemberRepository.findById.mockResolvedValue(mockMember);
      mockDocumentsRepository.findCategoryById.mockResolvedValue(mockCategory);
      mockDocumentsRepository.create.mockResolvedValue({
        ...mockDoc,
        category: mockCategory,
      });

      const result = await service.registerDocument('user-1', 'family-1', createDto);
      expect(result.id).toBe('doc-1');
      expect(result.uploadStatus).toBe('uploaded');
      expect(result.processingStatus).toBe(DocumentProcessingStatus.PENDING);
      expect(result.category?.name).toBe('Identity Verification');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith('doc-1');
    });

    it('should throw BadRequestException if file format is unsupported', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      const badDto = { ...createDto, originalFileName: 'virus.exe' };

      await expect(service.registerDocument('user-1', 'family-1', badDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if file exceeds size limit', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      const largeDto = { ...createDto, fileSize: 15 * 1024 * 1024 }; // 15MB

      await expect(service.registerDocument('user-1', 'family-1', largeDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if family member is from different family', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockFamilyMemberRepository.findById.mockResolvedValue({ ...mockMember, familyId: 'other' });

      await expect(service.registerDocument('user-1', 'family-1', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDocument', () => {
    it('should return document details if active and matches family', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockDocumentsRepository.findById.mockResolvedValue(mockDoc);

      const result = await service.getDocument('user-1', 'family-1', 'doc-1');
      expect(result.id).toBe('doc-1');
    });

    it('should throw NotFoundException if document belongs to different family', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockDocumentsRepository.findById.mockResolvedValue({ ...mockDoc, familyId: 'other' });

      await expect(service.getDocument('user-1', 'family-1', 'doc-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMetadata', () => {
    it('should update metadata successfully', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockDocumentsRepository.findById.mockResolvedValue(mockDoc);
      mockDocumentsRepository.update.mockResolvedValue({
        ...mockDoc,
        displayName: 'New Name',
      });

      const result = await service.updateMetadata('user-1', 'family-1', 'doc-1', {
        displayName: 'New Name',
      });
      expect(result.displayName).toBe('New Name');
    });
  });

  describe('getDownloadUrl', () => {
    it('should return download link', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockDocumentsRepository.findById.mockResolvedValue(mockDoc);
      mockCloudinaryService.generateDownloadUrl.mockReturnValue('https://signed.url');

      const result = await service.getDownloadUrl('user-1', 'family-1', 'doc-1');
      expect(result.url).toBe('https://signed.url');
      expect(result.expiresIn).toBe(900);
    });
  });

  describe('deleteDocument', () => {
    it('should soft delete successfully', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockDocumentsRepository.findById.mockResolvedValue(mockDoc);
      mockDocumentsRepository.softDelete.mockResolvedValue(mockDoc);

      await service.deleteDocument('user-1', 'family-1', 'doc-1');
      expect(mockDocumentsRepository.softDelete).toHaveBeenCalledWith('doc-1');
    });
  });
});
