import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { AiAnalysisResponseDto } from './dto/ai-analysis-response.dto';
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

@ApiTags('AI')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('v1/families/:familyId/documents')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get(':documentId/analysis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve AI analysis and extracted fields for a document' })
  @ApiOkResponse({
    description: 'AI analysis retrieved successfully.',
    type: AiAnalysisResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Document or AI analysis result not found.' })
  async getAnalysis(
    @Param('familyId') familyId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<AiAnalysisResponseDto> {
    return this.aiService.getAnalysisResult(user.userId, familyId, documentId);
  }
}
