import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DocumentsRepository } from './documents.repository';
import { FamilyRepository } from '../family/family.repository';
import { FamilyMemberRepository } from '../family-member/family-member.repository';
import { CloudinaryService } from './cloudinary.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentResponseDto, DocumentCategoryResponseDto } from './dto/document-response.dto';
import { UploadSignatureResponseDto } from './dto/upload-signature-response.dto';
import { DownloadUrlResponseDto } from './dto/download-url-response.dto';
import { Document, DocumentCategory } from '@prisma/client';

@Injectable()
export class DocumentsService {
  private readonly allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];

  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly familyRepository: FamilyRepository,
    private readonly familyMemberRepository: FamilyMemberRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // --- Helper: Verify Family Ownership ---
  private async verifyFamilyAccess(userId: string, familyId: string): Promise<void> {
    const family = await this.familyRepository.findById(familyId);
    if (!family || family.deletedAt !== null) {
      throw new NotFoundException(`Family workspace with ID "${familyId}" not found`);
    }
    if (family.ownerUserId !== userId) {
      throw new ForbiddenException('Access denied: You do not own this family workspace');
    }
  }

  // --- Helper: Validate File Metadata ---
  private validateFile(originalFileName: string, fileSize?: number): void {
    const extension = originalFileName.split('.').pop()?.toLowerCase();
    if (!extension || !this.allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `Invalid file type. Supported extensions are: ${this.allowedExtensions.join(', ')}`,
      );
    }

    if (fileSize && fileSize > 10 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds the maximum limit of 10MB');
    }
  }

  // --- Generate Upload Signature ---
  async getUploadSignature(
    userId: string,
    familyId: string,
  ): Promise<UploadSignatureResponseDto> {
    await this.verifyFamilyAccess(userId, familyId);
    return this.cloudinaryService.generateUploadSignature(familyId);
  }

  // --- Register Uploaded Document ---
  async registerDocument(
    userId: string,
    familyId: string,
    dto: CreateDocumentDto,
  ): Promise<DocumentResponseDto> {
    await this.verifyFamilyAccess(userId, familyId);

    // Validate size and file type from name
    this.validateFile(dto.originalFileName, dto.fileSize);

    // Validate family member if provided
    if (dto.familyMemberId) {
      const member = await this.familyMemberRepository.findById(dto.familyMemberId);
      if (!member || member.deletedAt !== null || member.familyId !== familyId) {
        throw new NotFoundException(`Family member with ID "${dto.familyMemberId}" not found in this family`);
      }
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await this.documentsRepository.findCategoryById(dto.categoryId);
      if (!category) {
        throw new NotFoundException(`Document category with ID "${dto.categoryId}" not found`);
      }
      if (!category.isActive) {
        throw new BadRequestException(`Document category "${category.name}" is currently inactive`);
      }
    }

    const document = await this.documentsRepository.create({
      familyId,
      familyMemberId: dto.familyMemberId || null,
      categoryId: dto.categoryId || null,
      originalFileName: dto.originalFileName,
      displayName: dto.displayName || dto.originalFileName,
      fileType: dto.fileType.toLowerCase(),
      fileSize: dto.fileSize || null,
      storageProvider: 'cloudinary',
      storageAssetId: dto.storageAssetId,
      storageUrlReference: null, // Dynamically generated timed download URLs used instead of public access references
      uploadStatus: 'uploaded',
      processingStatus: 'pending',
      reviewStatus: 'unreviewed',
    });

    return this.mapToResponseDto(document);
  }

  // --- List Active Documents ---
  async listDocuments(
    userId: string,
    familyId: string,
    filters: {
      familyMemberId?: string;
      categoryId?: string;
      processingStatus?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ documents: DocumentResponseDto[]; total: number }> {
    await this.verifyFamilyAccess(userId, familyId);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      familyId,
      deletedAt: null,
    };

    if (filters.familyMemberId) {
      whereClause.familyMemberId = filters.familyMemberId;
    }
    if (filters.categoryId) {
      whereClause.categoryId = filters.categoryId;
    }
    if (filters.processingStatus) {
      whereClause.processingStatus = filters.processingStatus;
    }

    const documents = await this.documentsRepository.findMany({
      skip,
      take: limit,
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.documentsRepository.count({
      where: whereClause,
    });

    return {
      documents: documents.map((doc) => this.mapToResponseDto(doc)),
      total,
    };
  }

  // --- Get Document Details ---
  async getDocument(
    userId: string,
    familyId: string,
    documentId: string,
  ): Promise<DocumentResponseDto> {
    await this.verifyFamilyAccess(userId, familyId);

    const document = await this.documentsRepository.findById(documentId);
    if (!document || document.deletedAt !== null || document.familyId !== familyId) {
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    return this.mapToResponseDto(document);
  }

  // --- Update Metadata ---
  async updateMetadata(
    userId: string,
    familyId: string,
    documentId: string,
    dto: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    await this.verifyFamilyAccess(userId, familyId);

    const document = await this.documentsRepository.findById(documentId);
    if (!document || document.deletedAt !== null || document.familyId !== familyId) {
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    const updateData: any = {};

    if (dto.displayName !== undefined) {
      if (dto.displayName.trim() === '') {
        throw new BadRequestException('Display name cannot be empty');
      }
      updateData.displayName = dto.displayName;
    }

    if (dto.familyMemberId !== undefined) {
      if (dto.familyMemberId === null) {
        updateData.familyMemberId = null;
      } else {
        const member = await this.familyMemberRepository.findById(dto.familyMemberId);
        if (!member || member.deletedAt !== null || member.familyId !== familyId) {
          throw new NotFoundException(`Family member with ID "${dto.familyMemberId}" not found in this family`);
        }
        updateData.familyMemberId = dto.familyMemberId;
      }
    }

    if (dto.categoryId !== undefined) {
      if (dto.categoryId === null) {
        updateData.categoryId = null;
      } else {
        const category = await this.documentsRepository.findCategoryById(dto.categoryId);
        if (!category) {
          throw new NotFoundException(`Document category with ID "${dto.categoryId}" not found`);
        }
        if (!category.isActive) {
          throw new BadRequestException(`Document category "${category.name}" is currently inactive`);
        }
        updateData.categoryId = dto.categoryId;
      }
    }

    const updatedDoc = await this.documentsRepository.update(documentId, updateData);
    return this.mapToResponseDto(updatedDoc);
  }

  // --- Generate Secure Timed Download URL ---
  async getDownloadUrl(
    userId: string,
    familyId: string,
    documentId: string,
  ): Promise<DownloadUrlResponseDto> {
    await this.verifyFamilyAccess(userId, familyId);

    const document = await this.documentsRepository.findById(documentId);
    if (!document || document.deletedAt !== null || document.familyId !== familyId) {
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    const expiresIn = 900; // 15 minutes
    const url = this.cloudinaryService.generateDownloadUrl(document.storageAssetId, expiresIn);

    return {
      url,
      expiresIn,
    };
  }

  // --- Soft Delete Document ---
  async deleteDocument(userId: string, familyId: string, documentId: string): Promise<void> {
    await this.verifyFamilyAccess(userId, familyId);

    const document = await this.documentsRepository.findById(documentId);
    if (!document || document.deletedAt !== null || document.familyId !== familyId) {
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    await this.documentsRepository.softDelete(documentId);
  }

  // --- List Categories ---
  async listCategories(): Promise<DocumentCategoryResponseDto[]> {
    const categories = await this.documentsRepository.findManyCategories({
      where: { isActive: true },
    });
    return categories.map((cat) => this.mapCategoryToResponseDto(cat));
  }

  // --- Mappers ---
  private mapToResponseDto(
    document: Document & { category?: DocumentCategory | null },
  ): DocumentResponseDto {
    return {
      id: document.id,
      familyId: document.familyId,
      familyMemberId: document.familyMemberId,
      categoryId: document.categoryId,
      category: document.category ? this.mapCategoryToResponseDto(document.category) : null,
      originalFileName: document.originalFileName,
      displayName: document.displayName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      storageProvider: document.storageProvider,
      storageAssetId: document.storageAssetId,
      storageUrlReference: document.storageUrlReference,
      uploadStatus: document.uploadStatus,
      processingStatus: document.processingStatus,
      reviewStatus: document.reviewStatus,
      issueStatus: document.issueStatus,
      issuedAt: document.issuedAt,
      expiresAt: document.expiresAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  private mapCategoryToResponseDto(category: DocumentCategory): DocumentCategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      normalizedKey: category.normalizedKey,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
