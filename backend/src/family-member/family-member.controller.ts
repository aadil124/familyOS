import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { FamilyMemberService } from './family-member.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
import { FamilyMemberResponseDto } from './dto/family-member-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Family Members')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('v1/families/:familyId/members')
export class FamilyMemberController {
  constructor(private readonly familyMemberService: FamilyMemberService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a member to the family workspace' })
  @ApiCreatedResponse({ description: 'Family member successfully created.', type: FamilyMemberResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  @ApiNotFoundResponse({ description: 'Family workspace not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async create(
    @Param('familyId') familyId: string,
    @Body() createFamilyMemberDto: CreateFamilyMemberDto,
  ): Promise<FamilyMemberResponseDto> {
    return this.familyMemberService.createMember(familyId, createFamilyMemberDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all active members in the family workspace' })
  @ApiOkResponse({ description: 'Active members list retrieved successfully.', type: [FamilyMemberResponseDto] })
  @ApiNotFoundResponse({ description: 'Family workspace not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findAll(@Param('familyId') familyId: string): Promise<FamilyMemberResponseDto[]> {
    return this.familyMemberService.getMembersByFamily(familyId);
  }

  @Get(':memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve specific member details' })
  @ApiOkResponse({ description: 'Family member details retrieved successfully.', type: FamilyMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Family member not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async findOne(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
  ): Promise<FamilyMemberResponseDto> {
    return this.familyMemberService.getMemberById(familyId, memberId);
  }

  @Patch(':memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update family member details' })
  @ApiOkResponse({ description: 'Family member successfully updated.', type: FamilyMemberResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  @ApiNotFoundResponse({ description: 'Family member not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async update(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
    @Body() updateFamilyMemberDto: UpdateFamilyMemberDto,
  ): Promise<FamilyMemberResponseDto> {
    return this.familyMemberService.updateMember(familyId, memberId, updateFamilyMemberDto);
  }

  @Delete(':memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a family member' })
  @ApiResponse({ status: 204, description: 'Family member successfully soft-deleted.' })
  @ApiNotFoundResponse({ description: 'Family member not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async remove(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    await this.familyMemberService.deleteMember(familyId, memberId);
  }
}
