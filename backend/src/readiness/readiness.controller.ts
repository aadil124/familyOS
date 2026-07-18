import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ReadinessService } from './readiness.service';
import { CreateReadinessAssessmentDto } from './dto/create-assessment.dto';
import { ReadinessAssessmentResponseDto } from './dto/assessment-response.dto';
import { LifeEventResponseDto } from './dto/life-event-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser as CurrentUserInterface } from '../auth/interfaces/auth.interface';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

@ApiTags('Life Events')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('v1/life-events')
export class LifeEventController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all active life events and Event preparation rules' })
  @ApiOkResponse({
    description: 'Active life events retrieved successfully.',
    type: [LifeEventResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findAll(): Promise<LifeEventResponseDto[]> {
    return this.readinessService.listEvents();
  }
}

@ApiTags('Readiness Assessments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('v1/families/:familyId/assessments')
export class ReadinessController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Run and create a readiness assessment for a life event' })
  @ApiCreatedResponse({
    description: 'Readiness assessment created successfully.',
    type: ReadinessAssessmentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input parameters.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Family, member, or life event not found.' })
  async create(
    @Param('familyId') familyId: string,
    @Body() createReadinessAssessmentDto: CreateReadinessAssessmentDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<ReadinessAssessmentResponseDto> {
    return this.readinessService.createAssessment(user.userId, familyId, createReadinessAssessmentDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List past readiness assessments in a family workspace' })
  @ApiOkResponse({
    description: 'Readiness assessments retrieved successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  async findAll(
    @Param('familyId') familyId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    const skip = (page - 1) * limit;
    const { data, total } = await this.readinessService.listAssessments(user.userId, familyId, {
      skip,
      take: limit,
    });
    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  @Get(':assessmentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get details of a specific readiness assessment' })
  @ApiOkResponse({
    description: 'Readiness assessment retrieved successfully.',
    type: ReadinessAssessmentResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Assessment not found.' })
  async findOne(
    @Param('familyId') familyId: string,
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<ReadinessAssessmentResponseDto> {
    return this.readinessService.getAssessment(user.userId, familyId, assessmentId);
  }
}
