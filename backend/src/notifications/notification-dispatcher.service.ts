import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { PrismaService } from '../database/prisma.service';
import { Notification } from '@prisma/client';

export interface CreateNotificationInput {
  type: string;
  severity: string;
  title: string;
  message: string;
  relatedDocumentId?: string | null;
  relatedFamilyMemberId?: string | null;
  relatedAssessmentId?: string | null;
  actionLabel?: string | null;
  actionReference?: string | null;
  expiresAt?: Date | null;
}

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly prisma: PrismaService,
  ) {}

  async dispatch(
    userId: string,
    familyId: string,
    input: CreateNotificationInput,
  ): Promise<Notification> {
    const isDeduplicable = ['missing_document', 'mismatch'].includes(input.type);

    if (isDeduplicable) {
      // Find duplicate unread notification
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId,
          familyId,
          type: input.type,
          status: 'unread',
          relatedDocumentId: input.relatedDocumentId || null,
          relatedFamilyMemberId: input.relatedFamilyMemberId || null,
          relatedAssessmentId: input.relatedAssessmentId || null,
        },
      });

      if (existing) {
        this.logger.log(`Deduplicating notification of type "${input.type}" for family "${familyId}"`);
        return this.notificationRepository.update(existing.id, {
          title: input.title,
          message: input.message,
          severity: input.severity,
          updatedAt: new Date(),
        });
      }
    }

    this.logger.log(`Dispatching new notification of type "${input.type}" for family "${familyId}"`);
    return this.notificationRepository.create({
      userId,
      familyId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      relatedDocumentId: input.relatedDocumentId || null,
      relatedFamilyMemberId: input.relatedFamilyMemberId || null,
      relatedAssessmentId: input.relatedAssessmentId || null,
      actionLabel: input.actionLabel || null,
      actionReference: input.actionReference || null,
      expiresAt: input.expiresAt || null,
    });
  }
}
