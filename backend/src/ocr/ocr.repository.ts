import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OCRResult, Prisma } from '@prisma/client';

@Injectable()
export class OcrRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OCRResultUncheckedCreateInput): Promise<OCRResult> {
    return this.prisma.oCRResult.create({
      data,
    });
  }

  async findByDocumentId(documentId: string): Promise<OCRResult | null> {
    return this.prisma.oCRResult.findUnique({
      where: { documentId },
    });
  }

  async update(id: string, data: Prisma.OCRResultUncheckedUpdateInput): Promise<OCRResult> {
    return this.prisma.oCRResult.update({
      where: { id },
      data,
    });
  }
}
