import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DocumentProcessingStatus } from '@prisma/client';

@Injectable()
export class ContextBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async buildContext(familyId: string): Promise<string> {
    // 1. Fetch active family members
    const members = await this.prisma.familyMember.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
    });

    // 2. Fetch active documents
    const documents = await this.prisma.document.findMany({
      where: {
        familyId,
        processingStatus: DocumentProcessingStatus.SUCCESS,
        deletedAt: null,
      },
      include: {
        category: true,
        familyMember: true,
        documentAnalysis: true,
      },
    });

    // 3. Fetch latest readiness assessments
    const assessments = await this.prisma.readinessAssessment.findMany({
      where: {
        familyId,
        status: 'completed',
        deletedAt: null,
      },
      include: {
        lifeEvent: true,
        familyMember: true,
      },
      orderBy: {
        assessedAt: 'desc',
      },
    });

    // Deduplicate assessments to keep only the latest per life event + family member combo
    const latestAssessmentsMap = new Map<string, any>();
    for (const a of assessments) {
      const key = `${a.lifeEventId}_${a.familyMemberId || 'family'}`;
      if (!latestAssessmentsMap.has(key)) {
        latestAssessmentsMap.set(key, a);
      }
    }
    const latestAssessments = Array.from(latestAssessmentsMap.values());

    // 4. Format Document Context
    let contextStr = '=== FAMILY VAULT DOCUMENTS ===\n';
    if (documents.length === 0) {
      contextStr += 'No active documents uploaded in the vault.\n';
    } else {
      documents.forEach((doc) => {
        const memberName = doc.familyMember ? doc.familyMember.fullName : 'Family Workspace';
        const categoryName = doc.category ? doc.category.name : (doc.documentAnalysis?.detectedDocumentType || 'Unknown');
        contextStr += `- Document: "${doc.displayName}"\n`;
        contextStr += `  Type/Category: ${categoryName}\n`;
        contextStr += `  Owner/Associated Member: ${memberName}\n`;
        if (doc.expiresAt) {
          contextStr += `  Expires At: ${doc.expiresAt.toISOString().split('T')[0]}\n`;
        }
        if (doc.issuedAt) {
          contextStr += `  Issued At: ${doc.issuedAt.toISOString().split('T')[0]}\n`;
        }
        if (doc.documentAnalysis?.extractedFields) {
          const fields = doc.documentAnalysis.extractedFields as Record<string, any>;
          contextStr += `  Extracted Fields: ${JSON.stringify(fields)}\n`;
        }
        contextStr += '\n';
      });
    }

    // 5. Format Readiness Assessment Context
    contextStr += '\n=== VAULT READINESS ASSESSMENTS ===\n';
    if (latestAssessments.length === 0) {
      contextStr += 'No readiness assessments run yet.\n';
    } else {
      latestAssessments.forEach((assessment) => {
        const memberName = assessment.familyMember ? assessment.familyMember.fullName : 'Family Workspace';
        contextStr += `- Life Event: "${assessment.lifeEvent.name}"\n`;
        contextStr += `  Target Member: ${memberName}\n`;
        contextStr += `  Readiness Score: ${assessment.readinessScore !== null ? `${assessment.readinessScore}%` : 'N/A'}\n`;
        contextStr += `  Readiness Level: ${assessment.readinessLevel || 'Unknown'}\n`;
        if (assessment.missingDocuments) {
          const missing = assessment.missingDocuments as string[];
          if (missing && missing.length > 0) {
            contextStr += `  Missing Documents: ${missing.join(', ')}\n`;
          }
        }
        if (assessment.mismatchWarnings) {
          const mismatches = assessment.mismatchWarnings as any[];
          if (mismatches && mismatches.length > 0) {
            contextStr += `  Warnings: ${JSON.stringify(mismatches)}\n`;
          }
        }
        if (assessment.nextSteps) {
          contextStr += `  Next Steps: ${assessment.nextSteps}\n`;
        }
        contextStr += '\n';
      });
    }

    // 6. Format Family Members Profile info
    contextStr += '\n=== FAMILY MEMBERS ===\n';
    if (members.length === 0) {
      contextStr += 'No family members added yet.\n';
    } else {
      members.forEach((m) => {
        contextStr += `- Name: ${m.fullName}\n`;
        if (m.relationship) {
          contextStr += `  Relationship: ${m.relationship}\n`;
        }
        if (m.dateOfBirth) {
          contextStr += `  Date of Birth: ${m.dateOfBirth.toISOString().split('T')[0]}\n`;
        }
        contextStr += '\n';
      });
    }

    return contextStr;
  }
}
