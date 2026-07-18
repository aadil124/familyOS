import { Test, TestingModule } from '@nestjs/testing';
import { OcrService } from '../ocr.service';
import { OcrRepository } from '../ocr.repository';
import { OcrProviderRegistry } from '../providers/ocr-provider.registry';
import { DocumentsRepository } from '../../documents/documents.repository';
import { FamilyRepository } from '../../family/family.repository';
import { CloudinaryService } from '../../documents/cloudinary.service';
import { OCRStatus, DocumentProcessingStatus, Family, Document, OCRResult } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { OcrProvider } from '../providers/ocr-provider.interface';

describe('OcrService', () => {
  let service: OcrService;
  let ocrRepository: any;
  let ocrProviderRegistry: any;
  let documentsRepository: any;
  let familyRepository: any;
  let cloudinaryService: any;

  const mockOcrRepository = {
    create: jest.fn(),
    findByDocumentId: jest.fn(),
    update: jest.fn(),
  };

  const mockActiveProvider: OcrProvider = {
    extractText: jest.fn(),
    getProviderName: jest.fn().mockReturnValue('mock'),
    getProviderVersion: jest.fn().mockReturnValue('v1.0'),
  };

  const mockOcrProviderRegistry = {
    getActiveProvider: jest.fn().mockReturnValue(mockActiveProvider),
  };

  const mockDocumentsRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockFamilyRepository = {
    findById: jest.fn(),
  };

  const mockCloudinaryService = {
    generateDownloadUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        { provide: OcrRepository, useValue: mockOcrRepository },
        { provide: OcrProviderRegistry, useValue: mockOcrProviderRegistry },
        { provide: DocumentsRepository, useValue: mockDocumentsRepository },
        { provide: FamilyRepository, useValue: mockFamilyRepository },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    ocrRepository = module.get<OcrRepository>(OcrRepository);
    ocrProviderRegistry = module.get<OcrProviderRegistry>(OcrProviderRegistry);
    documentsRepository = module.get<DocumentsRepository>(DocumentsRepository);
    familyRepository = module.get<FamilyRepository>(FamilyRepository);
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);

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
    reviewStatus: 'unreviewed',
    issueStatus: null,
    issuedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockOcrResult: OCRResult = {
    id: 'ocr-1',
    documentId: 'doc-1',
    provider: 'mock',
    providerVersion: 'v1.0',
    status: OCRStatus.COMPLETED,
    extractedText: 'MOCK TEXT',
    textReference: null,
    languageHints: null,
    confidenceScore: 0.95,
    failureReason: null,
    processedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('executeOcr', () => {
    it('should complete OCR and update states successfully if no cache exists', async () => {
      documentsRepository.findById.mockResolvedValue(mockDoc);
      ocrRepository.findByDocumentId.mockResolvedValue(null);
      cloudinaryService.generateDownloadUrl.mockReturnValue('https://secure.url');
      (mockActiveProvider.extractText as jest.Mock).mockResolvedValue({
        text: 'EXTRACTED TEXT',
        confidence: 0.98,
        provider: 'mock',
        providerVersion: 'v1.0',
      });

      await service.executeOcr('doc-1');

      expect(documentsRepository.update).toHaveBeenNthCalledWith(1, 'doc-1', {
        processingStatus: DocumentProcessingStatus.OCR_PROCESSING,
      });
      expect(ocrRepository.create).toHaveBeenCalledWith({
        documentId: 'doc-1',
        provider: 'mock',
        providerVersion: 'v1.0',
        status: OCRStatus.PROCESSING,
      });
      expect(mockActiveProvider.extractText).toHaveBeenCalledWith('https://secure.url');
      expect(ocrRepository.findByDocumentId).toHaveBeenCalledWith('doc-1');
    });

    it('should skip API processing if a completed cache exists matching provider and version', async () => {
      documentsRepository.findById.mockResolvedValue(mockDoc);
      ocrRepository.findByDocumentId.mockResolvedValue(mockOcrResult);

      await service.executeOcr('doc-1');

      expect(mockActiveProvider.extractText).not.toHaveBeenCalled();
      expect(documentsRepository.update).toHaveBeenCalledWith('doc-1', {
        processingStatus: DocumentProcessingStatus.AI_PROCESSING,
      });
    });

    it('should re-process if provider version changes (cache invalidation)', async () => {
      documentsRepository.findById.mockResolvedValue(mockDoc);
      ocrRepository.findByDocumentId.mockResolvedValue({
        ...mockOcrResult,
        providerVersion: 'v0.9',
      });
      cloudinaryService.generateDownloadUrl.mockReturnValue('https://secure.url');
      (mockActiveProvider.extractText as jest.Mock).mockResolvedValue({
        text: 'NEW TEXT',
        confidence: 0.99,
        provider: 'mock',
        providerVersion: 'v1.0',
      });

      await service.executeOcr('doc-1');

      expect(mockActiveProvider.extractText).toHaveBeenCalled();
      expect(ocrRepository.update).toHaveBeenCalled();
    });

    it('should set status to FAILED if provider extraction fails', async () => {
      documentsRepository.findById.mockResolvedValue(mockDoc);

      // First call: no cached OCR result exists.
      // Second call (inside catch): the newly created OCR record exists.
      ocrRepository.findByDocumentId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'ocr-1',
          documentId: 'doc-1',
          provider: 'mock',
          providerVersion: 'v1.0',
          status: OCRStatus.PROCESSING,
          extractedText: null,
          textReference: null,
          languageHints: null,
          confidenceScore: null,
          failureReason: null,
          processedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      cloudinaryService.generateDownloadUrl.mockReturnValue('https://secure.url');

      (mockActiveProvider.extractText as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      await service.executeOcr('doc-1');

      expect(ocrRepository.create).toHaveBeenCalledWith({
        documentId: 'doc-1',
        provider: 'mock',
        providerVersion: 'v1.0',
        status: OCRStatus.PROCESSING,
      });

      expect(ocrRepository.update).toHaveBeenCalledWith(
        'ocr-1',
        expect.objectContaining({
          status: OCRStatus.FAILED,
          failureReason: 'Network error',
        }),
      );

      expect(documentsRepository.update).toHaveBeenNthCalledWith(2, 'doc-1', {
        processingStatus: DocumentProcessingStatus.FAILED,
      });
    });
  });

  describe('getOcrResult', () => {
    it('should return result if workspace owner accesses valid document', async () => {
      familyRepository.findById.mockResolvedValue(mockFamily);
      documentsRepository.findById.mockResolvedValue(mockDoc);
      ocrRepository.findByDocumentId.mockResolvedValue(mockOcrResult);

      const result = await service.getOcrResult('user-1', 'family-1', 'doc-1');
      expect(result.id).toBe('ocr-1');
      expect(result.status).toBe(OCRStatus.COMPLETED);
    });

    it('should throw ForbiddenException if user is not family owner', async () => {
      familyRepository.findById.mockResolvedValue({
        ...mockFamily,
        ownerUserId: 'user-other',
      });

      await expect(service.getOcrResult('user-1', 'family-1', 'doc-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if document is soft-deleted', async () => {
      familyRepository.findById.mockResolvedValue(mockFamily);
      documentsRepository.findById.mockResolvedValue({
        ...mockDoc,
        deletedAt: new Date(),
      });

      await expect(service.getOcrResult('user-1', 'family-1', 'doc-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
