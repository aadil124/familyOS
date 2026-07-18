import { Test, TestingModule } from '@nestjs/testing';
import { OcrController } from '../ocr.controller';
import { OcrService } from '../ocr.service';
import { OcrResultResponseDto } from '../dto/ocr-result-response.dto';
import { OCRStatus } from '@prisma/client';
import { CurrentUser } from '../../auth/interfaces/auth.interface';
// import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('OcrController', () => {
  let controller: OcrController;
  let ocrService: OcrService;

  const mockOcrService = {
    getOcrResult: jest.fn(),
  };

  const mockUser: CurrentUser = {
    userId: 'user-1',
    email: 'test@example.com',
    role: 'OWNER',
  };

  const mockOcrResultDto: OcrResultResponseDto = {
    id: 'ocr-1',
    documentId: 'doc-1',
    provider: 'mock',
    providerVersion: 'v1.0',
    status: OCRStatus.COMPLETED,
    extractedText: 'MOCK EXTRACTED TEXT',
    confidenceScore: 0.95,
    failureReason: null,
    processedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OcrController],
      providers: [
        {
          provide: OcrService,
          useValue: mockOcrService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<OcrController>(OcrController);
    ocrService = module.get<OcrService>(OcrService);

    jest.clearAllMocks();
  });

  describe('getOcr', () => {
    it('should successfully return the OCR result DTO', async () => {
      mockOcrService.getOcrResult.mockResolvedValue(mockOcrResultDto);

      const result = await controller.getOcr('family-1', 'doc-1', mockUser);

      expect(ocrService.getOcrResult).toHaveBeenCalledWith('user-1', 'family-1', 'doc-1');
      expect(result).toEqual(mockOcrResultDto);
    });
  });
});
