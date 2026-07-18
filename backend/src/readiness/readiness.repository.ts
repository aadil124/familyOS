import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LifeEvent, ReadinessAssessment, Prisma } from '@prisma/client';

@Injectable()
export class ReadinessRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- LifeEvent Queries ---
  async findManyEvents(params?: {
    where?: Prisma.LifeEventWhereInput;
    orderBy?: Prisma.LifeEventOrderByWithRelationInput;
  }): Promise<LifeEvent[]> {
    return this.prisma.lifeEvent.findMany({
      where: params?.where,
      orderBy: params?.orderBy,
    });
  }

  async findEventById(id: string): Promise<LifeEvent | null> {
    return this.prisma.lifeEvent.findUnique({
      where: { id },
    });
  }

  async findEventByKey(normalizedKey: string): Promise<LifeEvent | null> {
    return this.prisma.lifeEvent.findUnique({
      where: { normalizedKey },
    });
  }

  async createEvent(data: Prisma.LifeEventCreateInput): Promise<LifeEvent> {
    return this.prisma.lifeEvent.create({
      data,
    });
  }

  // --- ReadinessAssessment Queries ---
  async createAssessment(
    data: Prisma.ReadinessAssessmentUncheckedCreateInput,
  ): Promise<ReadinessAssessment> {
    return this.prisma.readinessAssessment.create({
      data,
      include: {
        lifeEvent: true,
      },
    });
  }

  async findAssessmentById(id: string): Promise<ReadinessAssessment | null> {
    return this.prisma.readinessAssessment.findUnique({
      where: { id },
      include: {
        lifeEvent: true,
      },
    });
  }

  async findManyAssessments(params?: {
    where?: Prisma.ReadinessAssessmentWhereInput;
    orderBy?: Prisma.ReadinessAssessmentOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<ReadinessAssessment[]> {
    return this.prisma.readinessAssessment.findMany({
      where: params?.where,
      orderBy: params?.orderBy,
      skip: params?.skip,
      take: params?.take,
      include: {
        lifeEvent: true,
      },
    });
  }

  async countAssessments(where?: Prisma.ReadinessAssessmentWhereInput): Promise<number> {
    return this.prisma.readinessAssessment.count({
      where,
    });
  }
}
