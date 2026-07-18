import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DocumentAnalysis, Prisma } from '@prisma/client';

@Injectable()
export class AiRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DocumentAnalysisUncheckedCreateInput): Promise<DocumentAnalysis> {
    return this.prisma.documentAnalysis.create({
      data,
    });
  }

  async findByDocumentId(documentId: string): Promise<DocumentAnalysis | null> {
    return this.prisma.documentAnalysis.findUnique({
      where: { documentId },
    });
  }

  async update(id: string, data: Prisma.DocumentAnalysisUncheckedUpdateInput): Promise<DocumentAnalysis> {
    return this.prisma.documentAnalysis.update({
      where: { id },
      data,
    });
  }
}
