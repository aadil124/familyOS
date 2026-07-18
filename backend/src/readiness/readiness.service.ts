import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ReadinessRepository } from './readiness.repository';
import { FamilyRepository } from '../family/family.repository';
import { FamilyMemberRepository } from '../family-member/family-member.repository';
import { DocumentsRepository } from '../documents/documents.repository';
import { CreateReadinessAssessmentDto } from './dto/create-assessment.dto';
import { ReadinessAssessmentResponseDto } from './dto/assessment-response.dto';
import { LifeEventResponseDto } from './dto/life-event-response.dto';
import { DocumentProcessingStatus, ReadinessAssessment, LifeEvent } from '@prisma/client';

@Injectable()
export class ReadinessService {
  constructor(
    private readonly readinessRepository: ReadinessRepository,
    private readonly familyRepository: FamilyRepository,
    private readonly familyMemberRepository: FamilyMemberRepository,
    private readonly documentsRepository: DocumentsRepository,
  ) {}

  // --- Helper: Verify Family Workspace Ownership ---
  private async verifyFamilyAccess(userId: string, familyId: string): Promise<void> {
    const family = await this.familyRepository.findById(familyId);
    if (!family || family.deletedAt !== null) {
      throw new NotFoundException(`Family workspace with ID "${familyId}" not found`);
    }
    if (family.ownerUserId !== userId) {
      throw new ForbiddenException('Access denied: You do not own this family workspace');
    }
  }

  // --- List Active Life Events ---
  async listEvents(): Promise<LifeEventResponseDto[]> {
    const events = await this.readinessRepository.findManyEvents({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return events.map((event) => this.mapEventToDto(event));
  }

  // --- Create/Run Readiness Assessment ---
  async createAssessment(
    userId: string,
    familyId: string,
    dto: CreateReadinessAssessmentDto,
  ): Promise<ReadinessAssessmentResponseDto> {
    // 1. Verify workspace access
    await this.verifyFamilyAccess(userId, familyId);

    // 2. Verify family member context if provided
    if (dto.familyMemberId) {
      const member = await this.familyMemberRepository.findById(dto.familyMemberId);
      if (!member || member.deletedAt !== null || member.familyId !== familyId) {
        throw new NotFoundException(`Family member with ID "${dto.familyMemberId}" not found in this family`);
      }
    }

    // 3. Fetch Life Event
    const event = await this.readinessRepository.findEventById(dto.lifeEventId);
    if (!event || !event.isActive) {
      throw new NotFoundException(`Life event with ID "${dto.lifeEventId}" not found or inactive`);
    }

    // 4. Fetch all active categories to map names/keys
    const categories = await this.documentsRepository.findManyCategories({
      where: { isActive: true },
    });

    // 5. Fetch all active documents for this workspace/member
    const documents = (await this.documentsRepository.findMany({
      where: {
        familyId,
        familyMemberId: dto.familyMemberId || null,
        deletedAt: null,
      },
    })) as any[];

    // 6. Evaluate rules
    let requiredKeys: string[] = [];
    const rules = event.expectedDocumentRules;

    if (Array.isArray(rules)) {
      requiredKeys = rules.filter((item) => typeof item === 'string');
    } else if (rules && typeof rules === 'object') {
      const typedRules = rules as any;
      if (Array.isArray(typedRules.requiredCategories)) {
        requiredKeys = typedRules.requiredCategories.filter((item: any) => typeof item === 'string');
      }
    }

    const availableDocsList: any[] = [];
    const missingDocsList: string[] = [];
    const expiryWarningsList: any[] = [];

    for (const key of requiredKeys) {
      const matchingCategory = categories.find(
        (c) => c.normalizedKey === key || c.id === key,
      );
      const categoryName = matchingCategory ? matchingCategory.name : key;

      // Look for a document matching this category in active state
      const matchingDoc = documents.find(
        (doc) =>
          doc.processingStatus === DocumentProcessingStatus.SUCCESS &&
          (doc.categoryId === key || (doc.category && doc.category.normalizedKey === key)),
      );

      if (matchingDoc) {
        availableDocsList.push({
          documentId: matchingDoc.id,
          displayName: matchingDoc.displayName,
          categoryKey: key,
          categoryName,
        });

        // Simple expiry check
        if (matchingDoc.expiresAt && new Date(matchingDoc.expiresAt) < new Date()) {
          expiryWarningsList.push({
            documentId: matchingDoc.id,
            displayName: matchingDoc.displayName,
            message: `Document "${matchingDoc.displayName}" expired on ${new Date(
              matchingDoc.expiresAt,
            ).toLocaleDateString()}`,
          });
        }
      } else {
        missingDocsList.push(categoryName);
      }
    }

    // 7. Calculate score & levels
    const totalRequired = requiredKeys.length;
    let score = 100;
    let level = 'Complete';

    if (totalRequired > 0) {
      const availableCount = availableDocsList.length;
      score = Math.round((availableCount / totalRequired) * 100 * 100) / 100;
      if (score === 100) {
        level = 'Complete';
      } else if (score > 0) {
        level = 'Partial';
      } else {
        level = 'None';
      }
    }

    // Generate simple next steps
    let nextSteps = 'Your documentation is ready for this life event.';
    if (missingDocsList.length > 0) {
      nextSteps = `Upload the following missing documents to improve readiness: ${missingDocsList.join(
        ', ',
      )}.`;
    }

    // 8. Create assessment record
    const assessment = await this.readinessRepository.createAssessment({
      familyId,
      familyMemberId: dto.familyMemberId || null,
      lifeEventId: dto.lifeEventId,
      requestedByUserId: userId,
      status: 'completed',
      readinessScore: score,
      readinessLevel: level,
      availableDocuments: availableDocsList as any,
      missingDocuments: missingDocsList as any,
      mismatchWarnings: [] as any, // Mismatches default empty, left as design decision
      expiryWarnings: expiryWarningsList as any,
      nextSteps,
      processSummary: event.description || 'Proceed with your Event Preparation.',
      confidenceScore: 1.0,
      failureReason: null,
    });

    return this.mapAssessmentToDto(assessment);
  }

  // --- List past assessments in a workspace ---
  async listAssessments(
    userId: string,
    familyId: string,
    pagination: { skip?: number; take?: number } = {},
  ): Promise<{ data: ReadinessAssessmentResponseDto[]; total: number }> {
    await this.verifyFamilyAccess(userId, familyId);

    const where: any = {
      familyId,
      deletedAt: null,
    };

    const assessments = await this.readinessRepository.findManyAssessments({
      where,
      orderBy: { assessedAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    });

    const total = await this.readinessRepository.countAssessments(where);

    return {
      data: assessments.map((a) => this.mapAssessmentToDto(a)),
      total,
    };
  }

  // --- Get assessment details ---
  async getAssessment(
    userId: string,
    familyId: string,
    assessmentId: string,
  ): Promise<ReadinessAssessmentResponseDto> {
    await this.verifyFamilyAccess(userId, familyId);

    const assessment = await this.readinessRepository.findAssessmentById(assessmentId);
    if (!assessment || assessment.deletedAt !== null || assessment.familyId !== familyId) {
      throw new NotFoundException(`Readiness assessment with ID "${assessmentId}" not found in this family`);
    }

    return this.mapAssessmentToDto(assessment);
  }

  // --- Helper: Mappers ---
  private mapEventToDto(event: LifeEvent): LifeEventResponseDto {
    return {
      id: event.id,
      name: event.name,
      normalizedKey: event.normalizedKey,
      description: event.description,
      category: event.category,
      expectedDocumentRules: event.expectedDocumentRules,
      isActive: event.isActive,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  private mapAssessmentToDto(assessment: ReadinessAssessment & { lifeEvent?: LifeEvent }): ReadinessAssessmentResponseDto {
    return {
      id: assessment.id,
      familyId: assessment.familyId,
      familyMemberId: assessment.familyMemberId,
      lifeEventId: assessment.lifeEventId,
      requestedByUserId: assessment.requestedByUserId,
      status: assessment.status,
      readinessScore: assessment.readinessScore,
      readinessLevel: assessment.readinessLevel,
      availableDocuments: assessment.availableDocuments,
      missingDocuments: assessment.missingDocuments,
      mismatchWarnings: assessment.mismatchWarnings,
      expiryWarnings: assessment.expiryWarnings,
      nextSteps: assessment.nextSteps,
      processSummary: assessment.processSummary,
      confidenceScore: assessment.confidenceScore,
      failureReason: assessment.failureReason,
      assessedAt: assessment.assessedAt,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
      lifeEvent: assessment.lifeEvent ? this.mapEventToDto(assessment.lifeEvent) : null,
    };
  }
}
