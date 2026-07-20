import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../ai.service';
import { AiRepository } from '../ai.repository';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { DocumentsRepository } from '../../documents/documents.repository';
import { FamilyRepository } from '../../family/family.repository';
import { FamilyMemberRepository } from '../../family-member/family-member.repository';
import { OcrRepository } from '../../ocr/ocr.repository';
import { AnalysisStatus, DocumentProcessingStatus, DocumentReviewStatus, OCRStatus, Family, FamilyMember, Document, DocumentAnalysis } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AiProvider } from '../providers/ai-provider.interface';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';

describe('AiService', () => {
  let service: AiService;
  let aiRepository: any;
  let aiProviderRegistry: any;
  let documentsRepository: any;
  let familyRepository: any;
  let familyMemberRepository: any;
  let ocrRepository: any;

  const mockAiRepository = {
    create: jest.fn(),
    findByDocumentId: jest.fn(),
    update: jest.fn(),
  };

  const mockActiveProvider: AiProvider = {
    extractMetadata: jest.fn(),
    getProviderName: jest.fn().mockReturnValue('mock'),
    getProviderVersion: jest.fn().mockReturnValue('v1.0'),
  };

  const mockAiProviderRegistry = {
    getActiveProvider: jest.fn().mockReturnValue(mockActiveProvider),
  };

  const mockDocumentsRepository = {
    findById: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  };

  const mockFamilyRepository = {
    findById: jest.fn(),
  };

  const mockFamilyMemberRepository = {
    findById: jest.fn(),
  };

  const mockOcrRepository = {
    findByDocumentId: jest.fn(),
  };

  const mockNotificationDispatcher = {
    dispatch: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: AiRepository, useValue: mockAiRepository },
        { provide: AiProviderRegistry, useValue: mockAiProviderRegistry },
        { provide: DocumentsRepository, useValue: mockDocumentsRepository },
        { provide: FamilyRepository, useValue: mockFamilyRepository },
        { provide: FamilyMemberRepository, useValue: mockFamilyMemberRepository },
        { provide: OcrRepository, useValue: mockOcrRepository },
        { provide: NotificationDispatcherService, useValue: mockNotificationDispatcher },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    aiRepository = module.get<AiRepository>(AiRepository);
    aiProviderRegistry = module.get<AiProviderRegistry>(AiProviderRegistry);
    documentsRepository = module.get<DocumentsRepository>(DocumentsRepository);
    familyRepository = module.get<FamilyRepository>(FamilyRepository);
    familyMemberRepository = module.get<FamilyMemberRepository>(FamilyMemberRepository);
    ocrRepository = module.get<OcrRepository>(OcrRepository);

    jest.clearAllMocks();
  });

  const mockFamily: Family = {
    id: 'family-1',
    ownerUserId: 'user-1',
    name: 'Doe Vault',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockMember: FamilyMember = {
    id: 'member-1',
    familyId: 'family-1',
    fullName: 'Jane Doe',
    relationship: 'Self',
    dateOfBirth: new Date('1990-01-01'),
    primaryEmail: 'jane@example.com',
    primaryPhone: '1234567890',
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

  const mockOcrResult = {
    id: 'ocr-1',
    documentId: 'doc-1',
    provider: 'mock',
    providerVersion: 'v1.0',
    status: OCRStatus.COMPLETED,
    extractedText: 'PASSPORT NAME: Jane Doe',
    confidenceScore: 0.95,
  };

  const mockAnalysis: DocumentAnalysis = {
    id: 'analysis-1',
    documentId: 'doc-1',
    provider: 'mock',
    providerVersion: 'v1.0',
    status: AnalysisStatus.COMPLETED,
    detectedDocumentType: 'Passport',
    extractedFields: { passportNumber: 'A1234567' },
    nameOnDocument: 'Jane Doe',
    addressOnDocument: null,
    issuedDate: '01/01/2020',
    expiryDate: '31/12/2030',
    confidenceScore: 0.98,
    mismatchFlags: { checks: { name: { matched: true, score: 1.0 } } },
    analysisSummary: 'Completed successfully.',
    failureReason: null,
    analyzedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('executeAnalysis', () => {
    it('should complete analysis successfully and update states if no cache exists', async () => {
      documentsRepository.findById.mockResolvedValue(mockDoc);
      ocrRepository.findByDocumentId.mockResolvedValue(mockOcrResult);
      aiRepository.findByDocumentId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockAnalysis);
      familyMemberRepository.findById.mockResolvedValue(mockMember);

      (mockActiveProvider.extractMetadata as jest.Mock).mockResolvedValue({
        detectedDocumentType: 'Passport',
        extractedFields: { passportNumber: 'A1234567' },
        nameOnDocument: 'Jane Doe',
        issuedDate: '01/01/2020',
        expiryDate: '31/12/2030',
        confidenceScore: 0.98,
        analysisSummary: 'Completed successfully.',
      });

      await service.executeAnalysis('doc-1');

      expect(documentsRepository.update).toHaveBeenNthCalledWith(1, 'doc-1', {
        processingStatus: DocumentProcessingStatus.AI_PROCESSING,
      });
      expect(aiRepository.create).toHaveBeenCalledWith({
        documentId: 'doc-1',
        provider: 'mock',
        providerVersion: 'v1.0',
        status: AnalysisStatus.PROCESSING,
      });
      expect(mockActiveProvider.extractMetadata).toHaveBeenCalledWith('PASSPORT NAME: Jane Doe');
      expect(documentsRepository.update).toHaveBeenNthCalledWith(2, 'doc-1', {
        processingStatus: DocumentProcessingStatus.SUCCESS,
        reviewStatus: DocumentReviewStatus.PENDING_REVIEW,
        issueStatus: null,
      });
    });

    it('should skip API processing if completed cache exists matching provider and version', async () => {
      documentsRepository.findById.mockResolvedValue(mockDoc);
      ocrRepository.findByDocumentId.mockResolvedValue(mockOcrResult);
      aiRepository.findByDocumentId.mockResolvedValue(mockAnalysis);

      await service.executeAnalysis('doc-1');

      expect(mockActiveProvider.extractMetadata).not.toHaveBeenCalled();
      expect(documentsRepository.update).toHaveBeenCalledWith('doc-1', {
        processingStatus: DocumentProcessingStatus.SUCCESS,
      });
    });

    it('should detect mismatch if similarity < 0.85', async () => {
      documentsRepository.findById.mockResolvedValue(mockDoc);
      ocrRepository.findByDocumentId.mockResolvedValue(mockOcrResult);
      aiRepository.findByDocumentId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockAnalysis);
      familyMemberRepository.findById.mockResolvedValue({
        ...mockMember,
        fullName: 'John Doe', // Mismatched name
      });

      (mockActiveProvider.extractMetadata as jest.Mock).mockResolvedValue({
        detectedDocumentType: 'Passport',
        extractedFields: { passportNumber: 'A1234567' },
        nameOnDocument: 'Jane Doe',
        confidenceScore: 0.98,
        analysisSummary: 'Completed.',
      });

      await service.executeAnalysis('doc-1');

      expect(aiRepository.update).toHaveBeenCalled();
      const lastUpdateCallArgs = aiRepository.update.mock.calls[0][1];
      expect(lastUpdateCallArgs.mismatchFlags.checks.name.matched).toBe(false);
      expect(documentsRepository.update).toHaveBeenNthCalledWith(2, 'doc-1', {
        processingStatus: DocumentProcessingStatus.SUCCESS,
        reviewStatus: DocumentReviewStatus.PENDING_REVIEW,
        issueStatus: 'mismatch_detected',
      });
    });

    it('should set status to FAILED if provider extraction fails', async () => {
      documentsRepository.findById.mockResolvedValue(mockDoc);
      ocrRepository.findByDocumentId.mockResolvedValue(mockOcrResult);
      
      aiRepository.findByDocumentId
        .mockResolvedValueOnce(null) // first check
        .mockResolvedValueOnce({ id: 'analysis-1' }); // error write check

      (mockActiveProvider.extractMetadata as jest.Mock).mockRejectedValue(new Error('LLM error'));

      await service.executeAnalysis('doc-1');

      expect(documentsRepository.update).toHaveBeenNthCalledWith(2, 'doc-1', {
        processingStatus: DocumentProcessingStatus.FAILED,
      });
      expect(aiRepository.update).toHaveBeenCalledWith('analysis-1', {
        status: AnalysisStatus.FAILED,
        failureReason: 'LLM error',
        analyzedAt: expect.any(Date),
      });
    });

    it('should gracefully handle record deletion (P2025) and not throw errors', async () => {
      documentsRepository.findById.mockResolvedValue(mockDoc);
      ocrRepository.findByDocumentId.mockResolvedValue(mockOcrResult);
      aiRepository.findByDocumentId.mockResolvedValue(null);
      
      const p2025Error = new PrismaClientKnownRequestError(
        'An operation failed because it depends on one or more records that were required but not found.',
        { code: 'P2025', clientVersion: '5.22.0' }
      );
      documentsRepository.update.mockRejectedValue(p2025Error);

      await expect(service.executeAnalysis('doc-1')).resolves.not.toThrow();
    });
  });

  describe('getAnalysisResult', () => {
    it('should return result if workspace owner accesses valid document', async () => {
      familyRepository.findById.mockResolvedValue(mockFamily);
      documentsRepository.findById.mockResolvedValue(mockDoc);
      aiRepository.findByDocumentId.mockResolvedValue(mockAnalysis);

      const result = await service.getAnalysisResult('user-1', 'family-1', 'doc-1');
      expect(result.id).toBe('analysis-1');
      expect(result.status).toBe(AnalysisStatus.COMPLETED);
    });

    it('should throw ForbiddenException if user is not family owner', async () => {
      familyRepository.findById.mockResolvedValue({
        ...mockFamily,
        ownerUserId: 'user-other',
      });

      await expect(service.getAnalysisResult('user-1', 'family-1', 'doc-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if document is soft-deleted', async () => {
      familyRepository.findById.mockResolvedValue(mockFamily);
      documentsRepository.findById.mockResolvedValue({
        ...mockDoc,
        deletedAt: new Date(),
      });

      await expect(service.getAnalysisResult('user-1', 'family-1', 'doc-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
