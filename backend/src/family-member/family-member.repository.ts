import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FamilyMember, Prisma } from '@prisma/client';

@Injectable()
export class FamilyMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.FamilyMemberUncheckedCreateInput): Promise<FamilyMember> {
    return this.prisma.familyMember.create({
      data,
    });
  }

  async findById(id: string): Promise<FamilyMember | null> {
    return this.prisma.familyMember.findUnique({
      where: { id },
    });
  }

  async findFirst(params: { where?: Prisma.FamilyMemberWhereInput }): Promise<FamilyMember | null> {
    return this.prisma.familyMember.findFirst({
      where: params.where,
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.FamilyMemberWhereInput;
    orderBy?: Prisma.FamilyMemberOrderByWithRelationInput;
  }): Promise<FamilyMember[]> {
    return this.prisma.familyMember.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy,
    });
  }

  async update(id: string, data: Prisma.FamilyMemberUncheckedUpdateInput): Promise<FamilyMember> {
    return this.prisma.familyMember.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<FamilyMember> {
    return this.prisma.familyMember.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
