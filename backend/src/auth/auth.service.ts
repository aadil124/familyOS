import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { TokenService } from './services/token.service';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto, RegisterResponseDto, TokenPairResponseDto, AuthUserResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { comparePassword } from './utils/password.util';
import { JwtPayload } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly tokenService: TokenService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const user = await this.usersService.createUser({
      email: registerDto.email,
      password: registerDto.password,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: 'OWNER',
    };

    const accessToken = await this.tokenService.generateAccessToken(payload);
    const refreshToken = await this.tokenService.generateRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Default refresh expiry of 7 days

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refreshToken,
      status: 'active',
      expiresAt,
    });

    const authUser: AuthUserResponseDto = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    };

    return {
      user: authUser,
      accessToken,
      refreshToken,
    };
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.validateCredentials(loginDto.email, loginDto.password);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: 'OWNER',
    };

    const accessToken = await this.tokenService.generateAccessToken(payload);
    const refreshToken = await this.tokenService.generateRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refreshToken,
      status: 'active',
      expiresAt,
    });

    const authUser: AuthUserResponseDto = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    };

    return {
      user: authUser,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<TokenPairResponseDto> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const activeToken = await this.refreshTokenRepository.findActiveToken(refreshToken);

    if (!activeToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenPayload: JwtPayload = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    const newAccessToken = await this.tokenService.generateAccessToken(tokenPayload);
    const newRefreshToken = await this.tokenService.generateRefreshToken(tokenPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const newRefreshTokenRecord = await this.refreshTokenRepository.create({
      userId: payload.sub,
      tokenHash: newRefreshToken,
      status: 'active',
      expiresAt,
    });

    // Revoke the old refresh token and link it to the replacement
    await this.refreshTokenRepository.update(activeToken.id, {
      status: 'revoked',
      revokedAt: new Date(),
      replacedByTokenId: newRefreshTokenRecord.id,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeFamily(userId);
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    return this.usersService.findById(userId);
  }

  async validateCredentials(email: string, password: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.usersService.findByEmail(email);
  }
}
