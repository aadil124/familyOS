import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { NotificationRepository } from '../notification.repository';
import { FamilyRepository } from '../../family/family.repository';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: any;
  let familyRepository: any;

  const mockNotificationRepository = {
    findMany: jest.fn(),
    count: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockFamilyRepository = {
    findById: jest.fn(),
  };

  const mockFamily = {
    id: 'family-1',
    ownerUserId: 'user-1',
    name: 'Doe Vault',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockNotification = {
    id: 'n-1',
    userId: 'user-1',
    familyId: 'family-1',
    type: 'expiry',
    severity: 'warning',
    title: 'Passport Expiring',
    message: 'Jane passport expires soon.',
    status: 'unread',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationRepository, useValue: mockNotificationRepository },
        { provide: FamilyRepository, useValue: mockFamilyRepository },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get<NotificationRepository>(NotificationRepository);
    familyRepository = module.get<FamilyRepository>(FamilyRepository);

    jest.clearAllMocks();
  });

  describe('listNotifications', () => {
    it('should throw NotFoundException if family does not exist', async () => {
      mockFamilyRepository.findById.mockResolvedValue(null);

      await expect(
        service.listNotifications('user-1', 'family-1', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not family owner', async () => {
      mockFamilyRepository.findById.mockResolvedValue({
        ...mockFamily,
        ownerUserId: 'user-different',
      });

      await expect(
        service.listNotifications('user-1', 'family-1', { page: 1, limit: 10 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return list and total count successfully', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockNotificationRepository.findMany.mockResolvedValue([mockNotification]);
      mockNotificationRepository.count.mockResolvedValue(1);

      const result = await service.listNotifications('user-1', 'family-1', { page: 1, limit: 10 });

      expect(notificationRepository.findMany).toHaveBeenCalledWith('family-1', 0, 10, undefined);
      expect(notificationRepository.count).toHaveBeenCalledWith('family-1', undefined);
      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException if notification does not belong to family', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockNotificationRepository.findById.mockResolvedValue({
        ...mockNotification,
        familyId: 'family-different',
      });

      await expect(
        service.markAsRead('user-1', 'family-1', 'n-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return already read notification without calling update', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockNotificationRepository.findById.mockResolvedValue({
        ...mockNotification,
        status: 'read',
      });

      const result = await service.markAsRead('user-1', 'family-1', 'n-1');

      expect(notificationRepository.update).not.toHaveBeenCalled();
      expect(result.status).toBe('read');
    });

    it('should successfully update unread notification status to read', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockNotificationRepository.findById.mockResolvedValue(mockNotification);
      mockNotificationRepository.update.mockResolvedValue({
        ...mockNotification,
        status: 'read',
        readAt: new Date(),
      });

      const result = await service.markAsRead('user-1', 'family-1', 'n-1');

      expect(notificationRepository.update).toHaveBeenCalledWith('n-1', expect.objectContaining({
        status: 'read',
      }));
      expect(result.status).toBe('read');
    });
  });
});
