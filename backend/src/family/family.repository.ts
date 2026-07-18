import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Family, Prisma } from '@prisma/client';

@Injectable()
export class FamilyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.FamilyUncheckedCreateInput): Promise<Family> {
    return this.prisma.family.create({
      data,
    });
  }

  async findById(id: string): Promise<Family | null> {
    return this.prisma.family.findUnique({
      where: { id },
    });
  }

  async findFirst(params: { where?: Prisma.FamilyWhereInput }): Promise<Family | null> {
    return this.prisma.family.findFirst({
      where: params.where,
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.FamilyWhereInput;
    orderBy?: Prisma.FamilyOrderByWithRelationInput;
  }): Promise<Family[]> {
    return this.prisma.family.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy,
    });
  }

  async update(id: string, data: Prisma.FamilyUncheckedUpdateInput): Promise<Family> {
    return this.prisma.family.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<Family> {
    return this.prisma.family.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
