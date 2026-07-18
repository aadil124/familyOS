import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Notification, Prisma } from '@prisma/client';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification> {
    return this.prisma.notification.create({
      data,
    });
  }

  async findMany(
    familyId: string,
    skip: number,
    take: number,
    status?: string,
  ): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        familyId,
        ...(status ? { status } : {}),
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async count(familyId: string, status?: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        familyId,
        ...(status ? { status } : {}),
      },
    });
  }

  async findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Prisma.NotificationUncheckedUpdateInput): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data,
    });
  }

  async deleteStale(beforeDate: Date): Promise<Prisma.BatchPayload> {
    return this.prisma.notification.deleteMany({
      where: {
        status: { in: ['read', 'dismissed'] },
        updatedAt: { lt: beforeDate },
      },
    });
  }
}
