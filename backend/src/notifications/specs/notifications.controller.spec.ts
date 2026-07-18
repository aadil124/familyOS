import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../notifications.controller';
import { NotificationsService } from '../notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/interfaces/auth.interface';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    listNotifications: jest.fn(),
    markAsRead: jest.fn(),
  };

  const mockUser: CurrentUser = {
    userId: 'user-1',
    email: 'test@example.com',
    role: 'OWNER',
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
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should retrieve a list of notifications with pagination metadata', async () => {
      mockNotificationsService.listNotifications.mockResolvedValue({
        data: [mockNotification],
        total: 1,
      });

      const result = await controller.findAll('family-1', { page: 1, limit: 10 }, mockUser);

      expect(service.listNotifications).toHaveBeenCalledWith('user-1', 'family-1', { page: 1, limit: 10 });
      expect(result).toEqual({
        success: true,
        data: [mockNotification],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
        },
      });
    });
  });

  describe('markReadPatch', () => {
    it('should successfully update status to read via PATCH', async () => {
      const updatedMock = { ...mockNotification, status: 'read' };
      mockNotificationsService.markAsRead.mockResolvedValue(updatedMock);

      const result = await controller.markReadPatch('family-1', 'n-1', mockUser);

      expect(service.markAsRead).toHaveBeenCalledWith('user-1', 'family-1', 'n-1');
      expect(result).toEqual({
        success: true,
        data: updatedMock,
      });
    });
  });

  describe('markReadPut', () => {
    it('should successfully update status to read via PUT', async () => {
      const updatedMock = { ...mockNotification, status: 'read' };
      mockNotificationsService.markAsRead.mockResolvedValue(updatedMock);

      const result = await controller.markReadPut('family-1', 'n-1', mockUser);

      expect(service.markAsRead).toHaveBeenCalledWith('user-1', 'family-1', 'n-1');
      expect(result).toEqual({
        success: true,
        data: updatedMock,
      });
    });
  });
});
