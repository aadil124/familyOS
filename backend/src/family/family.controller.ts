import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { FamilyService } from './family.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { FamilyResponseDto } from './dto/family-response.dto';
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
} from '@nestjs/swagger';

@ApiTags('Family')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('v1/families')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new family workspace' })
  @ApiCreatedResponse({ description: 'Family workspace successfully created.', type: FamilyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async create(
    @Body() createFamilyDto: CreateFamilyDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<FamilyResponseDto> {
    return this.familyService.createFamily(user.userId, createFamilyDto.name);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all active families' })
  @ApiOkResponse({ description: 'Active families list retrieved successfully.', type: [FamilyResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findAll(@CurrentUser() user: CurrentUserInterface): Promise<FamilyResponseDto[]> {
    return this.familyService.getFamiliesByOwner(user.userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve family workspace details' })
  @ApiOkResponse({ description: 'Family workspace details retrieved successfully.', type: FamilyResponseDto })
  @ApiNotFoundResponse({ description: 'Family workspace not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findOne(@Param('id') id: string): Promise<FamilyResponseDto> {
    return this.familyService.getFamilyById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update family workspace details' })
  @ApiOkResponse({ description: 'Family workspace successfully updated.', type: FamilyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  @ApiNotFoundResponse({ description: 'Family workspace not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async update(
    @Param('id') id: string,
    @Body() updateFamilyDto: UpdateFamilyDto,
  ): Promise<FamilyResponseDto> {
    return this.familyService.updateFamily(id, updateFamilyDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a family workspace' })
  @ApiOkResponse({ description: 'Family workspace successfully soft-deleted.' })
  @ApiNotFoundResponse({ description: 'Family workspace not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.familyService.deleteFamily(id);
  }
}
