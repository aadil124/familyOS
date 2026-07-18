import { Test, TestingModule } from '@nestjs/testing';
import { LifeEventController, ReadinessController } from '../readiness.controller';
import { ReadinessService } from '../readiness.service';
import { CreateReadinessAssessmentDto } from '../dto/create-assessment.dto';
import { ReadinessAssessmentResponseDto } from '../dto/assessment-response.dto';
import { LifeEventResponseDto } from '../dto/life-event-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('Readiness Controllers', () => {
  let readinessController: ReadinessController;
  let lifeEventController: LifeEventController;
  let service: ReadinessService;

  const mockService = {
    listEvents: jest.fn(),
    createAssessment: jest.fn(),
    listAssessments: jest.fn(),
    getAssessment: jest.fn(),
  };

  const mockCurrentUser = {
    userId: 'user-123',
    email: 'john@doe.com',
    role: 'OWNER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LifeEventController, ReadinessController],
      providers: [
        {
          provide: ReadinessService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockCurrentUser;
          return true;
        },
      })
      .compile();

    readinessController = module.get<ReadinessController>(ReadinessController);
    lifeEventController = module.get<LifeEventController>(LifeEventController);
    service = module.get<ReadinessService>(ReadinessService);

    jest.clearAllMocks();
  });

  describe('LifeEventController', () => {
    it('should return list of active events', async () => {
      const mockEvents: LifeEventResponseDto[] = [
        {
          id: 'event-1',
          name: 'Driving License',
          normalizedKey: 'driving_license',
          description: 'Apply license',
          category: 'Government',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockService.listEvents.mockResolvedValue(mockEvents);

      const result = await lifeEventController.findAll();
      expect(result).toEqual(mockEvents);
      expect(mockService.listEvents).toHaveBeenCalled();
    });
  });

  describe('ReadinessController', () => {
    const mockAssessment: ReadinessAssessmentResponseDto = {
      id: 'ra-1',
      familyId: 'fam-1',
      familyMemberId: 'member-1',
      lifeEventId: 'event-1',
      requestedByUserId: 'user-123',
      status: 'completed',
      readinessScore: 100,
      readinessLevel: 'Complete',
      availableDocuments: [],
      missingDocuments: [],
      mismatchWarnings: [],
      expiryWarnings: [],
      nextSteps: 'Done',
      processSummary: 'Summary',
      confidenceScore: 1.0,
      failureReason: null,
      assessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lifeEvent: null,
    };

    it('should create an assessment successfully', async () => {
      const dto: CreateReadinessAssessmentDto = {
        lifeEventId: 'event-1',
        familyMemberId: 'member-1',
      };
      mockService.createAssessment.mockResolvedValue(mockAssessment);

      const result = await readinessController.create('fam-1', dto, mockCurrentUser);
      expect(result).toEqual(mockAssessment);
      expect(mockService.createAssessment).toHaveBeenCalledWith(
        'user-123',
        'fam-1',
        dto,
      );
    });

    it('should return list of assessments with success wrapper and metadata', async () => {
      mockService.listAssessments.mockResolvedValue({
        data: [mockAssessment],
        total: 1,
      });

      const result = await readinessController.findAll('fam-1', 1, 20, mockCurrentUser);
      expect(result).toEqual({
        success: true,
        data: [mockAssessment],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
        },
      });
      expect(mockService.listAssessments).toHaveBeenCalledWith(
        'user-123',
        'fam-1',
        { skip: 0, take: 20 },
      );
    });

    it('should return details of a specific assessment', async () => {
      mockService.getAssessment.mockResolvedValue(mockAssessment);

      const result = await readinessController.findOne('fam-1', 'ra-1', mockCurrentUser);
      expect(result).toEqual(mockAssessment);
      expect(mockService.getAssessment).toHaveBeenCalledWith(
        'user-123',
        'fam-1',
        'ra-1',
      );
    });
  });
});
