import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OcrRepository } from './ocr.repository';
import { OcrProviderRegistry } from './providers/ocr-provider.registry';
import { DocumentsRepository } from '../documents/documents.repository';
import { FamilyRepository } from '../family/family.repository';
import { CloudinaryService } from '../documents/cloudinary.service';
import { OCRStatus, DocumentProcessingStatus, OCRResult } from '@prisma/client';
import { OcrResultResponseDto } from './dto/ocr-result-response.dto';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private readonly ocrRepository: OcrRepository,
    private readonly ocrProviderRegistry: OcrProviderRegistry,
    private readonly documentsRepository: DocumentsRepository,
    private readonly familyRepository: FamilyRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // --- Helper: Verify Family Ownership ---
  private async verifyFamilyAccess(userId: string, familyId: string): Promise<void> {
    const family = await this.familyRepository.findById(familyId);
    if (!family || family.deletedAt !== null) {
      throw new NotFoundException(`Family workspace with ID "${familyId}" not found`);
    }
    if (family.ownerUserId !== userId) {
      throw new ForbiddenException('Access denied: You do not own this family workspace');
    }
  }

  // --- Execute OCR Extraction (Worker Entry Point) ---
  async executeOcr(documentId: string): Promise<void> {
    const document = await this.documentsRepository.findById(documentId);
    if (!document || document.deletedAt !== null) {
      this.logger.warn(`Document with ID "${documentId}" not found or deleted. Skipping OCR.`);
      return;
    }

    const activeProvider = this.ocrProviderRegistry.getActiveProvider();
    const activeName = activeProvider.getProviderName();
    const activeVersion = activeProvider.getProviderVersion();

    // Check caching: If valid result exists for active provider + version, bypass API execution
    const existingResult = await this.ocrRepository.findByDocumentId(documentId);
    if (
      existingResult &&
      existingResult.status === OCRStatus.COMPLETED &&
      existingResult.provider === activeName &&
      existingResult.providerVersion === activeVersion
    ) {
      this.logger.log(`OCR Cache Hit for document ${documentId}. Bypassing provider execution.`);
      // Maintain state consistency
      await this.documentsRepository.update(documentId, {
        processingStatus: DocumentProcessingStatus.AI_PROCESSING,
      });
      return;
    }

    // Set document state to processing
    await this.documentsRepository.update(documentId, {
      processingStatus: DocumentProcessingStatus.OCR_PROCESSING,
    });

    // Create or update OCRResult record to processing
    if (existingResult) {
      await this.ocrRepository.update(existingResult.id, {
        provider: activeName,
        providerVersion: activeVersion,
        status: OCRStatus.PROCESSING,
        extractedText: null,
        confidenceScore: null,
        failureReason: null,
        processedAt: null,
      });
    } else {
      await this.ocrRepository.create({
        documentId,
        provider: activeName,
        providerVersion: activeVersion,
        status: OCRStatus.PROCESSING,
      });
    }

    try {
      const downloadUrl = this.cloudinaryService.generateDownloadUrl(document.storageAssetId);
      
      const result = await activeProvider.extractText(downloadUrl);

      // Save successful result
      const currentResult = await this.ocrRepository.findByDocumentId(documentId);
      if (currentResult) {
        await this.ocrRepository.update(currentResult.id, {
          status: OCRStatus.COMPLETED,
          extractedText: result.text,
          confidenceScore: result.confidence,
          processedAt: new Date(),
        });
      }

      // Update Document processing state to AI_PROCESSING (ready for next step)
      await this.documentsRepository.update(documentId, {
        processingStatus: DocumentProcessingStatus.AI_PROCESSING,
      });
      this.logger.log(`OCR processing completed successfully for document ${documentId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`OCR processing failed for document ${documentId}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);

      // Save failure details
      const currentResult = await this.ocrRepository.findByDocumentId(documentId);
      if (currentResult) {
        await this.ocrRepository.update(currentResult.id, {
          status: OCRStatus.FAILED,
          failureReason: errorMessage,
          processedAt: new Date(),
        });
      }

      // Update Document processing state to FAILED
      await this.documentsRepository.update(documentId, {
        processingStatus: DocumentProcessingStatus.FAILED,
      });
    }
  }

  // --- Get OCR Result (Controller API) ---
  async getOcrResult(
    userId: string,
    familyId: string,
    documentId: string,
  ): Promise<OcrResultResponseDto> {
    await this.verifyFamilyAccess(userId, familyId);

    const document = await this.documentsRepository.findById(documentId);
    if (!document || document.deletedAt !== null || document.familyId !== familyId) {
      throw new NotFoundException(`Document with ID "${documentId}" not found in this family`);
    }

    const ocrResult = await this.ocrRepository.findByDocumentId(documentId);
    if (!ocrResult) {
      throw new NotFoundException(`OCR result for document with ID "${documentId}" not found`);
    }

    return this.mapToResponseDto(ocrResult);
  }

  // --- DTO Mapper ---
  private mapToResponseDto(ocrResult: OCRResult): OcrResultResponseDto {
    return {
      id: ocrResult.id,
      documentId: ocrResult.documentId,
      provider: ocrResult.provider,
      providerVersion: ocrResult.providerVersion,
      status: ocrResult.status,
      extractedText: ocrResult.extractedText,
      confidenceScore: ocrResult.confidenceScore,
      failureReason: ocrResult.failureReason,
      processedAt: ocrResult.processedAt,
      createdAt: ocrResult.createdAt,
      updatedAt: ocrResult.updatedAt,
    };
  }
}
