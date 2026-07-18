import { Test, TestingModule } from '@nestjs/testing';
import { ReadinessService } from '../readiness.service';
import { ReadinessRepository } from '../readiness.repository';
import { FamilyRepository } from '../../family/family.repository';
import { FamilyMemberRepository } from '../../family-member/family-member.repository';
import { DocumentsRepository } from '../../documents/documents.repository';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { LifeEvent, ReadinessAssessment, Family, FamilyMember, Document, DocumentCategory, DocumentProcessingStatus } from '@prisma/client';

describe('ReadinessService', () => {
  let service: ReadinessService;
  let readinessRepository: ReadinessRepository;
  let familyRepository: FamilyRepository;
  let familyMemberRepository: FamilyMemberRepository;
  let documentsRepository: DocumentsRepository;

  const mockReadinessRepository = {
    findManyEvents: jest.fn(),
    findEventById: jest.fn(),
    findEventByKey: jest.fn(),
    createEvent: jest.fn(),
    createAssessment: jest.fn(),
    findAssessmentById: jest.fn(),
    findManyAssessments: jest.fn(),
    countAssessments: jest.fn(),
  };

  const mockFamilyRepository = {
    findById: jest.fn(),
  };

  const mockFamilyMemberRepository = {
    findById: jest.fn(),
  };

  const mockDocumentsRepository = {
    findManyCategories: jest.fn(),
    findMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadinessService,
        {
          provide: ReadinessRepository,
          useValue: mockReadinessRepository,
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
          provide: DocumentsRepository,
          useValue: mockDocumentsRepository,
        },
      ],
    }).compile();

    service = module.get<ReadinessService>(ReadinessService);
    readinessRepository = module.get<ReadinessRepository>(ReadinessRepository);
    familyRepository = module.get<FamilyRepository>(FamilyRepository);
    familyMemberRepository = module.get<FamilyMemberRepository>(FamilyMemberRepository);
    documentsRepository = module.get<DocumentsRepository>(DocumentsRepository);

    jest.clearAllMocks();
  });

  const mockFamily: Family = {
    id: 'fam-1',
    ownerUserId: 'user-1',
    name: 'Doe Workspace',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockMember: FamilyMember = {
    id: 'member-1',
    familyId: 'fam-1',
    fullName: 'Jane Doe',
    relationship: 'Spouse',
    dateOfBirth: new Date(),
    primaryEmail: 'jane@doe.com',
    primaryPhone: '1234567890',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockLifeEvent: LifeEvent = {
    id: 'event-1',
    name: 'Passport Renewal',
    normalizedKey: 'passport_renewal',
    description: 'Renewing passport.',
    category: 'Government',
    expectedDocumentRules: ['identity', 'address'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategories: DocumentCategory[] = [
    {
      id: 'cat-id-1',
      name: 'Identity Verification',
      normalizedKey: 'identity',
      description: 'Identity docs',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat-id-2',
      name: 'Proof of Address',
      normalizedKey: 'address',
      description: 'Address docs',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  describe('createAssessment', () => {
    it('should throw NotFoundException if family does not exist', async () => {
      mockFamilyRepository.findById.mockResolvedValue(null);

      await expect(
        service.createAssessment('user-1', 'fam-1', { lifeEventId: 'event-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own family', async () => {
      mockFamilyRepository.findById.mockResolvedValue({
        ...mockFamily,
        ownerUserId: 'other-user',
      });

      await expect(
        service.createAssessment('user-1', 'fam-1', { lifeEventId: 'event-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if family member does not belong to family', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockFamilyMemberRepository.findById.mockResolvedValue({
        ...mockMember,
        familyId: 'other-fam',
      });

      await expect(
        service.createAssessment('user-1', 'fam-1', {
          lifeEventId: 'event-1',
          familyMemberId: 'member-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if life event does not exist or is inactive', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockReadinessRepository.findEventById.mockResolvedValue(null);

      await expect(
        service.createAssessment('user-1', 'fam-1', { lifeEventId: 'event-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate 100% score (Complete) if all documents exist', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockReadinessRepository.findEventById.mockResolvedValue(mockLifeEvent);
      mockDocumentsRepository.findManyCategories.mockResolvedValue(mockCategories);

      const mockDocuments = [
        {
          id: 'doc-1',
          familyId: 'fam-1',
          familyMemberId: null,
          categoryId: 'cat-id-1',
          category: mockCategories[0],
          originalFileName: 'passport.jpg',
          displayName: 'Jane Passport',
          fileType: 'jpg',
          fileSize: 1024,
          storageProvider: 'cloudinary',
          storageAssetId: 'asset-1',
          storageUrlReference: 'url-1',
          uploadStatus: 'success',
          processingStatus: DocumentProcessingStatus.SUCCESS,
          reviewStatus: 'UNREVIEWED',
          issueStatus: null,
          issuedAt: null,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'doc-2',
          familyId: 'fam-1',
          familyMemberId: null,
          categoryId: 'cat-id-2',
          category: mockCategories[1],
          originalFileName: 'bill.jpg',
          displayName: 'Jane Bill',
          fileType: 'jpg',
          fileSize: 1024,
          storageProvider: 'cloudinary',
          storageAssetId: 'asset-2',
          storageUrlReference: 'url-2',
          uploadStatus: 'success',
          processingStatus: DocumentProcessingStatus.SUCCESS,
          reviewStatus: 'UNREVIEWED',
          issueStatus: null,
          issuedAt: null,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      mockDocumentsRepository.findMany.mockResolvedValue(mockDocuments);

      const mockAssessmentResult: ReadinessAssessment = {
        id: 'ra-1',
        familyId: 'fam-1',
        familyMemberId: null,
        lifeEventId: 'event-1',
        requestedByUserId: 'user-1',
        status: 'completed',
        readinessScore: 100,
        readinessLevel: 'Complete',
        availableDocuments: {} as any,
        missingDocuments: {} as any,
        mismatchWarnings: {} as any,
        expiryWarnings: {} as any,
        nextSteps: 'Your documentation is ready.',
        processSummary: 'Summary text',
        confidenceScore: 1.0,
        failureReason: null,
        assessedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockReadinessRepository.createAssessment.mockResolvedValue(mockAssessmentResult);

      const result = await service.createAssessment('user-1', 'fam-1', {
        lifeEventId: 'event-1',
      });

      expect(result.readinessScore).toBe(100);
      expect(result.readinessLevel).toBe('Complete');
      expect(mockReadinessRepository.createAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          readinessScore: 100,
          readinessLevel: 'Complete',
        }),
      );
    });

    it('should calculate 50% score (Partial) if only one document exists', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockReadinessRepository.findEventById.mockResolvedValue(mockLifeEvent);
      mockDocumentsRepository.findManyCategories.mockResolvedValue(mockCategories);

      const mockDocuments = [
        {
          id: 'doc-1',
          familyId: 'fam-1',
          familyMemberId: null,
          categoryId: 'cat-id-1',
          category: mockCategories[0],
          originalFileName: 'passport.jpg',
          displayName: 'Jane Passport',
          fileType: 'jpg',
          fileSize: 1024,
          storageProvider: 'cloudinary',
          storageAssetId: 'asset-1',
          storageUrlReference: 'url-1',
          uploadStatus: 'success',
          processingStatus: DocumentProcessingStatus.SUCCESS,
          reviewStatus: 'UNREVIEWED',
          issueStatus: null,
          issuedAt: null,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      mockDocumentsRepository.findMany.mockResolvedValue(mockDocuments);

      const mockAssessmentResult: ReadinessAssessment = {
        id: 'ra-1',
        familyId: 'fam-1',
        familyMemberId: null,
        lifeEventId: 'event-1',
        requestedByUserId: 'user-1',
        status: 'completed',
        readinessScore: 50,
        readinessLevel: 'Partial',
        availableDocuments: {} as any,
        missingDocuments: {} as any,
        mismatchWarnings: {} as any,
        expiryWarnings: {} as any,
        nextSteps: 'Upload missing.',
        processSummary: 'Summary text',
        confidenceScore: 1.0,
        failureReason: null,
        assessedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockReadinessRepository.createAssessment.mockResolvedValue(mockAssessmentResult);

      const result = await service.createAssessment('user-1', 'fam-1', {
        lifeEventId: 'event-1',
      });

      expect(result.readinessScore).toBe(50);
      expect(result.readinessLevel).toBe('Partial');
      expect(mockReadinessRepository.createAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          readinessScore: 50,
          readinessLevel: 'Partial',
        }),
      );
    });
  });
});
