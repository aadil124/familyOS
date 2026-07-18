import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { FamilyRepository } from '../family/family.repository';
import { ListNotificationsQueryDto } from './dto/list-notifications.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { Notification } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly familyRepository: FamilyRepository,
  ) {}

  private async verifyFamilyAccess(userId: string, familyId: string): Promise<void> {
    const family = await this.familyRepository.findById(familyId);
    if (!family || family.deletedAt !== null) {
      throw new NotFoundException(`Family workspace with ID "${familyId}" not found`);
    }
    if (family.ownerUserId !== userId) {
      throw new ForbiddenException('Access denied: You do not own this family workspace');
    }
  }

  private async verifyNotificationAccess(familyId: string, id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification || notification.familyId !== familyId) {
      throw new NotFoundException(`Notification with ID "${id}" not found in this family`);
    }
    return notification;
  }

  async listNotifications(
    userId: string,
    familyId: string,
    query: ListNotificationsQueryDto,
  ): Promise<{ data: NotificationResponseDto[]; total: number }> {
    await this.verifyFamilyAccess(userId, familyId);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const notifications = await this.notificationRepository.findMany(
      familyId,
      skip,
      limit,
      query.status,
    );

    const total = await this.notificationRepository.count(familyId, query.status);

    const data = notifications.map((n) => this.mapToDto(n));

    return {
      data,
      total,
    };
  }

  async markAsRead(
    userId: string,
    familyId: string,
    notificationId: string,
  ): Promise<NotificationResponseDto> {
    await this.verifyFamilyAccess(userId, familyId);
    const notification = await this.verifyNotificationAccess(familyId, notificationId);

    if (notification.status === 'read') {
      return this.mapToDto(notification);
    }

    const updated = await this.notificationRepository.update(notificationId, {
      status: 'read',
      readAt: new Date(),
    });

    return this.mapToDto(updated);
  }

  private mapToDto(n: Notification): NotificationResponseDto {
    return {
      id: n.id,
      userId: n.userId,
      familyId: n.familyId,
      relatedDocumentId: n.relatedDocumentId,
      relatedFamilyMemberId: n.relatedFamilyMemberId,
      relatedAssessmentId: n.relatedAssessmentId,
      type: n.type,
      severity: n.severity,
      title: n.title,
      message: n.message,
      status: n.status,
      actionLabel: n.actionLabel,
      actionReference: n.actionReference,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      readAt: n.readAt,
      dismissedAt: n.dismissedAt,
      expiresAt: n.expiresAt,
    };
  }
}
