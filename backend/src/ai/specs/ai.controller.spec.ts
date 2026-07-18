import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from '../ai.controller';
import { AiService } from '../ai.service';
import { AiAnalysisResponseDto } from '../dto/ai-analysis-response.dto';
import { AnalysisStatus } from '@prisma/client';
import { CurrentUser } from '../../auth/interfaces/auth.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('AiController', () => {
  let controller: AiController;
  let aiService: AiService;

  const mockAiService = {
    getAnalysisResult: jest.fn(),
  };

  const mockUser: CurrentUser = {
    userId: 'user-1',
    email: 'test@example.com',
    role: 'OWNER',
  };

  const mockAnalysisDto: AiAnalysisResponseDto = {
    id: 'analysis-1',
    documentId: 'doc-1',
    provider: 'mock',
    providerVersion: 'v1.0',
    status: AnalysisStatus.COMPLETED,
    detectedDocumentType: 'Passport',
    extractedFields: { passportNumber: 'A1234567' },
    nameOnDocument: 'Jane Doe',
    addressOnDocument: null,
    issuedDate: '01/01/2020',
    expiryDate: '31/12/2030',
    confidenceScore: 0.98,
    mismatchFlags: { checks: { name: { matched: true, score: 1.0 } } },
    analysisSummary: 'Completed successfully.',
    analyzedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<AiController>(AiController);
    aiService = module.get<AiService>(AiService);

    jest.clearAllMocks();
  });

  describe('getAnalysis', () => {
    it('should successfully return the AI analysis response DTO', async () => {
      mockAiService.getAnalysisResult.mockResolvedValue(mockAnalysisDto);

      const result = await controller.getAnalysis('family-1', 'doc-1', mockUser);

      expect(aiService.getAnalysisResult).toHaveBeenCalledWith('user-1', 'family-1', 'doc-1');
      expect(result).toEqual(mockAnalysisDto);
    });
  });
});
