import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AiRepository } from './ai.repository';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { DocumentsRepository } from '../documents/documents.repository';
import { FamilyRepository } from '../family/family.repository';
import { FamilyMemberRepository } from '../family-member/family-member.repository';
import { OcrRepository } from '../ocr/ocr.repository';
import { computeLevenshteinSimilarity } from '../common/utils/string-similarity';
import { AnalysisStatus, DocumentProcessingStatus, DocumentReviewStatus, OCRStatus, DocumentAnalysis, Prisma } from '@prisma/client';
import { AiAnalysisResponseDto } from './dto/ai-analysis-response.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly aiRepository: AiRepository,
    private readonly aiProviderRegistry: AiProviderRegistry,
    private readonly documentsRepository: DocumentsRepository,
    private readonly familyRepository: FamilyRepository,
    private readonly familyMemberRepository: FamilyMemberRepository,
    private readonly ocrRepository: OcrRepository,
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

  // --- Background AI Analysis pipeline worker ---
  async executeAnalysis(documentId: string): Promise<void> {
    try {
      const document = await this.documentsRepository.findById(documentId);
      if (!document || document.deletedAt !== null) {
        this.logger.warn(`Document with ID "${documentId}" not found or deleted. Skipping AI Analysis.`);
        return;
      }

      const ocrResult = await this.ocrRepository.findByDocumentId(documentId);
      if (!ocrResult || ocrResult.status !== OCRStatus.COMPLETED || !ocrResult.extractedText) {
        this.logger.warn(`No completed OCR text found for document "${documentId}". Skipping AI Analysis.`);
        return;
      }

      const activeProvider = this.aiProviderRegistry.getActiveProvider();
      const activeName = activeProvider.getProviderName();
      const activeVersion = activeProvider.getProviderVersion();

      // Check caching
      const existingAnalysis = await this.aiRepository.findByDocumentId(documentId);
      if (
        existingAnalysis &&
        existingAnalysis.status === AnalysisStatus.COMPLETED &&
        existingAnalysis.provider === activeName &&
        existingAnalysis.providerVersion === activeVersion
      ) {
        this.logger.log(`AI Analysis Cache Hit for document ${documentId}. Bypassing provider execution.`);
        await this.documentsRepository.update(documentId, {
          processingStatus: DocumentProcessingStatus.SUCCESS,
        });
        return;
      }

      // Transition overall document processing state to AI_PROCESSING
      await this.documentsRepository.update(documentId, {
        processingStatus: DocumentProcessingStatus.AI_PROCESSING,
      });

      // Upsert DocumentAnalysis state to PROCESSING
      if (existingAnalysis) {
        await this.aiRepository.update(existingAnalysis.id, {
          provider: activeName,
          providerVersion: activeVersion,
          status: AnalysisStatus.PROCESSING,
          detectedDocumentType: null,
          extractedFields: Prisma.DbNull,
          nameOnDocument: null,
          addressOnDocument: null,
          issuedDate: null,
          expiryDate: null,
          confidenceScore: null,
          mismatchFlags: Prisma.DbNull,
          analysisSummary: null,
          failureReason: null,
          analyzedAt: null,
        });
      } else {
        await this.aiRepository.create({
          documentId,
          provider: activeName,
          providerVersion: activeVersion,
          status: AnalysisStatus.PROCESSING,
        });
      }

      // Execute extraction
      const result = await activeProvider.extractMetadata(ocrResult.extractedText);

      // Perform discrepancy matching if familyMember is linked
      let mismatchFlags: any = null;
      let issueStatus: string | null = null;

      if (document.familyMemberId) {
        const member = await this.familyMemberRepository.findById(document.familyMemberId);
        if (member && member.deletedAt === null) {
          const similarity = computeLevenshteinSimilarity(member.fullName, result.nameOnDocument || '');
          const nameMatched = similarity >= 0.85;
          mismatchFlags = {
            checks: {
              name: {
                matched: nameMatched,
                score: Number(similarity.toFixed(2)),
              },
            },
          };
          if (!nameMatched) {
            issueStatus = 'mismatch_detected';
          }
        }
      }

      // Save complete analysis
      const currentAnalysis = await this.aiRepository.findByDocumentId(documentId);
      if (currentAnalysis) {
        await this.aiRepository.update(currentAnalysis.id, {
          status: AnalysisStatus.COMPLETED,
          detectedDocumentType: result.detectedDocumentType,
          extractedFields: result.extractedFields || {},
          nameOnDocument: result.nameOnDocument || null,
          addressOnDocument: result.addressOnDocument || null,
          issuedDate: result.issuedDate || null,
          expiryDate: result.expiryDate || null,
          confidenceScore: result.confidenceScore,
          mismatchFlags: mismatchFlags || {},
          analysisSummary: result.analysisSummary,
          analyzedAt: new Date(),
        });
      }

      // Finalize document status
      await this.documentsRepository.update(documentId, {
        processingStatus: DocumentProcessingStatus.SUCCESS,
        reviewStatus: DocumentReviewStatus.PENDING_REVIEW,
        issueStatus,
      });

      this.logger.log(`AI Analysis completed successfully for document ${documentId}`);

    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        this.logger.warn(`Document record disappeared during background execution for ${documentId}. Gracefully exiting.`);
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI Analysis processing failed for document ${documentId}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);

      try {
        const currentAnalysis = await this.aiRepository.findByDocumentId(documentId);
        if (currentAnalysis) {
          await this.aiRepository.update(currentAnalysis.id, {
            status: AnalysisStatus.FAILED,
            failureReason: errorMessage,
            analyzedAt: new Date(),
          });
        }

        await this.documentsRepository.update(documentId, {
          processingStatus: DocumentProcessingStatus.FAILED,
        });
      } catch (innerError) {
        this.logger.error(`Failed to write error state for document ${documentId}: ${innerError.message}`);
      }
    }
  }

  // --- Get Analysis Result (REST Controller Route) ---
  async getAnalysisResult(
    userId: string,
    familyId: string,
    documentId: string,
  ): Promise<AiAnalysisResponseDto> {
    await this.verifyFamilyAccess(userId, familyId);

    const document = await this.documentsRepository.findById(documentId);
    if (!document || document.deletedAt !== null || document.familyId !== familyId) {
      throw new NotFoundException(`Document with ID "${documentId}" not found in this family`);
    }

    const analysis = await this.aiRepository.findByDocumentId(documentId);
    if (!analysis) {
      throw new NotFoundException(`AI analysis result for document with ID "${documentId}" not found`);
    }

    return this.mapToResponseDto(analysis);
  }

  private mapToResponseDto(analysis: DocumentAnalysis): AiAnalysisResponseDto {
    return {
      id: analysis.id,
      documentId: analysis.documentId,
      provider: analysis.provider,
      providerVersion: analysis.providerVersion,
      status: analysis.status,
      detectedDocumentType: analysis.detectedDocumentType,
      extractedFields: analysis.extractedFields,
      nameOnDocument: analysis.nameOnDocument,
      addressOnDocument: analysis.addressOnDocument,
      issuedDate: analysis.issuedDate,
      expiryDate: analysis.expiryDate,
      confidenceScore: analysis.confidenceScore,
      mismatchFlags: analysis.mismatchFlags,
      analysisSummary: analysis.analysisSummary,
      analyzedAt: analysis.analyzedAt,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }
}
