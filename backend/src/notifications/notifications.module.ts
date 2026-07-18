import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationRepository } from './notification.repository';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { ExpirationScanService } from './expiration-scan.service';
import { PrismaModule } from '../database/prisma.module';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [PrismaModule, FamilyModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationRepository,
    NotificationDispatcherService,
    ExpirationScanService,
  ],
  exports: [
    NotificationRepository,
    NotificationDispatcherService,
  ],
})
export class NotificationsModule {}
