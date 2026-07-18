import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RefreshTokenAttributes, RefreshTokenCreateInput, RefreshTokenUpdateInput } from '../interfaces/refresh-token.interface';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: RefreshTokenCreateInput): Promise<RefreshTokenAttributes> {
    return this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        status: data.status,
        expiresAt: data.expiresAt,
        deviceLabel: data.deviceLabel,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async findActiveToken(token: string): Promise<RefreshTokenAttributes | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: token,
        status: 'active',
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  async revoke(id: string): Promise<RefreshTokenAttributes> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
      },
    });
  }

  async revokeFamily(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        status: 'active',
        revokedAt: null,
      },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
      },
    });
  }

  async update(id: string, data: RefreshTokenUpdateInput): Promise<RefreshTokenAttributes> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: {
        status: data.status,
        revokedAt: data.revokedAt,
        replacedByTokenId: data.replacedByTokenId,
      },
    });
  }

  async findById(id: string): Promise<RefreshTokenAttributes | null> {
    return this.prisma.refreshToken.findUnique({
      where: { id },
    });
  }
}
