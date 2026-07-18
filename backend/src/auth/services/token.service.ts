import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { JwtPayload } from '../interfaces/auth.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async generateAccessToken(payload: JwtPayload): Promise<string> {
    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    return this.jwtService.signAsync(payload, { secret, expiresIn });
  }

  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshPayload = {
      ...payload,
      jti: randomUUID(),
    };
    return this.jwtService.signAsync(refreshPayload, { secret, expiresIn });
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    const secret = this.configService.get<string>('JWT_SECRET');
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
