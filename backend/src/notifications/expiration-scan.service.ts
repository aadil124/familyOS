import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Injectable()
export class ExpirationScanService implements OnModuleInit {
  private readonly logger = new Logger(ExpirationScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  onModuleInit() {
    // Run an initial scan in the background 5 seconds after startup
    setTimeout(() => {
      this.scanExpirations().catch((err) => {
        this.logger.error(`Initial expiration scan failed: ${err.message}`, err.stack);
      });
    }, 5000);

    // Schedule to run every 24 hours (86,400,000 milliseconds)
    setInterval(() => {
      this.scanExpirations().catch((err) => {
        this.logger.error(`Scheduled expiration scan failed: ${err.message}`, err.stack);
      });
    }, 24 * 60 * 60 * 1000);
  }

  async scanExpirations(): Promise<void> {
    this.logger.log('Starting document expiration scan...');

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // Query active documents with expiry dates
    const documents = await this.prisma.document.findMany({
      where: {
        processingStatus: 'SUCCESS',
        deletedAt: null,
        expiresAt: {
          not: null,
        },
      },
      include: {
        family: true,
        familyMember: true,
      },
    });

    this.logger.log(`Found ${documents.length} active documents with expiry dates to evaluate.`);

    for (const doc of documents) {
      if (!doc.expiresAt) continue;

      const expiryDate = new Date(doc.expiresAt);
      const isExpired = expiryDate < now;
      const isExpiringSoon = expiryDate >= now && expiryDate <= thirtyDaysFromNow;

      if (isExpired || isExpiringSoon) {
        const userId = doc.family.ownerUserId;
        const familyId = doc.familyId;
        const memberName = doc.familyMember ? doc.familyMember.fullName : 'a family member';

        const severity = isExpired ? 'critical' : 'warning';
        const title = isExpired ? 'Document Expired' : 'Document Expiring Soon';
        
        let message = '';
        if (isExpired) {
          message = `The document "${doc.displayName}" associated with ${memberName} has expired.`;
        } else {
          const diffTime = Math.abs(expiryDate.getTime() - now.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          message = `The document "${doc.displayName}" associated with ${memberName} expires in ${diffDays} days.`;
        }

        // Check if an unread notification already exists for this document
        const existing = await this.prisma.notification.findFirst({
          where: {
            familyId,
            relatedDocumentId: doc.id,
            type: 'expiry',
            status: 'unread',
          },
        });

        if (existing) {
          // If the severity or message changed (e.g. from warning to critical), update it
          if (existing.severity !== severity || existing.message !== message) {
            await this.prisma.notification.update({
              where: { id: existing.id },
              data: {
                severity,
                message,
                title,
                updatedAt: new Date(),
              },
            });
            this.logger.log(`Updated expiration notification for document "${doc.displayName}" (ID: ${doc.id})`);
          }
        } else {
          // Dispatch a new alert
          await this.notificationDispatcher.dispatch(userId, familyId, {
            type: 'expiry',
            severity,
            title,
            message,
            relatedDocumentId: doc.id,
            relatedFamilyMemberId: doc.familyMemberId,
            actionLabel: 'View Document',
            actionReference: `/vault?documentId=${doc.id}`,
          });
          this.logger.log(`Dispatched new expiration notification for document "${doc.displayName}" (ID: ${doc.id})`);
        }
      }
    }

    this.logger.log('Document expiration scan completed.');
  }
}
