import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentResponseDto, DocumentCategoryResponseDto } from './dto/document-response.dto';
import { UploadSignatureResponseDto } from './dto/upload-signature-response.dto';
import { DownloadUrlResponseDto } from './dto/download-url-response.dto';
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

@ApiTags('Documents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('v1/families/:familyId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-signature')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate Cloudinary direct signed upload parameters' })
  @ApiOkResponse({
    description: 'Signed upload parameters generated successfully.',
    type: UploadSignatureResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Family workspace not found.' })
  async getUploadSignature(
    @Param('familyId') familyId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<UploadSignatureResponseDto> {
    return this.documentsService.getUploadSignature(user.userId, familyId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register an uploaded document with backend metadata' })
  @ApiCreatedResponse({
    description: 'Document registered successfully.',
    type: DocumentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or file validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Family, member, or category not found.' })
  async create(
    @Param('familyId') familyId: string,
    @Body() createDocumentDto: CreateDocumentDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.registerDocument(user.userId, familyId, createDocumentDto);
  }

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all active document categories' })
  @ApiOkResponse({
    description: 'Active document categories retrieved successfully.',
    type: [DocumentCategoryResponseDto],
  })
  async listCategories(): Promise<DocumentCategoryResponseDto[]> {
    return this.documentsService.listCategories();
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active documents in the family workspace' })
  @ApiOkResponse({
    description: 'Active documents list retrieved successfully.',
    type: [DocumentResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Family workspace not found.' })
  async findAll(
    @Param('familyId') familyId: string,
    @CurrentUser() user: CurrentUserInterface,
    @Query('familyMemberId') familyMemberId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('processingStatus') processingStatus?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<DocumentResponseDto[]> {
    const result = await this.documentsService.listDocuments(user.userId, familyId, {
      familyMemberId,
      categoryId,
      processingStatus,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return result.documents;
  }

  @Get(':documentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve specific document details and metadata' })
  @ApiOkResponse({
    description: 'Document details retrieved successfully.',
    type: DocumentResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Document not found.' })
  async findOne(
    @Param('familyId') familyId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.getDocument(user.userId, familyId, documentId);
  }

  @Patch(':documentId/metadata')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update document metadata' })
  @ApiOkResponse({
    description: 'Document metadata updated successfully.',
    type: DocumentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Document, member, or category not found.' })
  async update(
    @Param('familyId') familyId: string,
    @Param('documentId') documentId: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.updateMetadata(
      user.userId,
      familyId,
      documentId,
      updateDocumentDto,
    );
  }

  @Get(':documentId/download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a secure signed download URL for the document' })
  @ApiOkResponse({
    description: 'Secure download URL generated successfully.',
    type: DownloadUrlResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Document not found.' })
  async getDownloadUrl(
    @Param('familyId') familyId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<DownloadUrlResponseDto> {
    return this.documentsService.getDownloadUrl(user.userId, familyId, documentId);
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a document from the family workspace' })
  @ApiOkResponse({ description: 'Document successfully soft-deleted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Document not found.' })
  async remove(
    @Param('familyId') familyId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<void> {
    await this.documentsService.deleteDocument(user.userId, familyId, documentId);
  }
}
