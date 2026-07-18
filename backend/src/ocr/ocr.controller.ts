import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OcrService } from './ocr.service';
import { OcrResultResponseDto } from './dto/ocr-result-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser as CurrentUserInterface } from '../auth/interfaces/auth.interface';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

@ApiTags('OCR')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('v1/families/:familyId/documents')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Get(':documentId/ocr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve OCR status and extracted text for a document' })
  @ApiOkResponse({
    description: 'OCR result retrieved successfully.',
    type: OcrResultResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Document or OCR result not found.' })
  async getOcr(
    @Param('familyId') familyId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<OcrResultResponseDto> {
    return this.ocrService.getOcrResult(user.userId, familyId, documentId);
  }
}
