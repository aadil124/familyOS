import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Document, DocumentCategory, Prisma } from '@prisma/client';

@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Document Operations ---

  async create(data: Prisma.DocumentUncheckedCreateInput): Promise<Document> {
    return this.prisma.document.create({
      data,
    });
  }

  async findById(id: string): Promise<Document | null> {
    return this.prisma.document.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  async findFirst(params: { where?: Prisma.DocumentWhereInput }): Promise<Document | null> {
    return this.prisma.document.findFirst({
      where: params.where,
      include: {
        category: true,
      },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.DocumentWhereInput;
    orderBy?: Prisma.DocumentOrderByWithRelationInput;
  }): Promise<Document[]> {
    return this.prisma.document.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy,
      include: {
        category: true,
      },
    });
  }

  async count(params: { where?: Prisma.DocumentWhereInput }): Promise<number> {
    return this.prisma.document.count({
      where: params.where,
    });
  }

  async update(id: string, data: Prisma.DocumentUncheckedUpdateInput): Promise<Document> {
    return this.prisma.document.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  async softDelete(id: string): Promise<Document> {
    return this.prisma.document.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  // --- Category Operations ---

  async findCategoryById(id: string): Promise<DocumentCategory | null> {
    return this.prisma.documentCategory.findUnique({
      where: { id },
    });
  }

  async findCategoryByKey(normalizedKey: string): Promise<DocumentCategory | null> {
    return this.prisma.documentCategory.findUnique({
      where: { normalizedKey },
    });
  }

  async createCategory(data: Prisma.DocumentCategoryCreateInput): Promise<DocumentCategory> {
    return this.prisma.documentCategory.create({
      data,
    });
  }

  async findManyCategories(params?: {
    where?: Prisma.DocumentCategoryWhereInput;
  }): Promise<DocumentCategory[]> {
    return this.prisma.documentCategory.findMany({
      where: params?.where,
    });
  }
}
