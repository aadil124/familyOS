import { Test, TestingModule } from '@nestjs/testing';
import { ExpirationScanService } from '../expiration-scan.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationDispatcherService } from '../notification-dispatcher.service';

describe('ExpirationScanService', () => {
  let service: ExpirationScanService;
  let prisma: any;
  let dispatcher: any;

  const mockPrisma = {
    document: {
      findMany: jest.fn(),
    },
    notification: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockDispatcher = {
    dispatch: jest.fn(),
  };

  const mockDoc = {
    id: 'doc-1',
    displayName: 'My Passport',
    familyId: 'family-1',
    familyMemberId: 'member-1',
    processingStatus: 'SUCCESS',
    deletedAt: null,
    expiresAt: new Date(),
    family: {
      ownerUserId: 'user-1',
    },
    familyMember: {
      fullName: 'Jane Doe',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpirationScanService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationDispatcherService, useValue: mockDispatcher },
      ],
    }).compile();

    service = module.get<ExpirationScanService>(ExpirationScanService);
    prisma = module.get<PrismaService>(PrismaService);
    dispatcher = module.get<NotificationDispatcherService>(NotificationDispatcherService);

    jest.clearAllMocks();
  });

  describe('scanExpirations', () => {
    it('should generate critical alert for expired documents', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 5); // 5 days ago

      mockPrisma.document.findMany.mockResolvedValue([
        {
          ...mockDoc,
          expiresAt: expiredDate,
        },
      ]);
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await service.scanExpirations();

      expect(dispatcher.dispatch).toHaveBeenCalledWith('user-1', 'family-1', expect.objectContaining({
        type: 'expiry',
        severity: 'critical',
        title: 'Document Expired',
      }));
    });

    it('should generate warning alert for documents expiring soon', async () => {
      const expiringSoonDate = new Date();
      expiringSoonDate.setDate(expiringSoonDate.getDate() + 10); // 10 days from now

      mockPrisma.document.findMany.mockResolvedValue([
        {
          ...mockDoc,
          expiresAt: expiringSoonDate,
        },
      ]);
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await service.scanExpirations();

      expect(dispatcher.dispatch).toHaveBeenCalledWith('user-1', 'family-1', expect.objectContaining({
        type: 'expiry',
        severity: 'warning',
        title: 'Document Expiring Soon',
      }));
    });

    it('should skip creating alert if unread alert already exists', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 5);

      mockPrisma.document.findMany.mockResolvedValue([
        {
          ...mockDoc,
          expiresAt: expiredDate,
        },
      ]);
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'existing-n',
        status: 'unread',
        severity: 'critical',
        message: 'The document "My Passport" associated with Jane Doe has expired.',
      });

      await service.scanExpirations();

      expect(dispatcher.dispatch).not.toHaveBeenCalled();
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });
  });
});
