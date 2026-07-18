import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './services/token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FamilyRoleGuard } from './guards/family-role.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, RefreshTokenRepository, JwtAuthGuard, FamilyRoleGuard],
  exports: [AuthService, TokenService, RefreshTokenRepository, JwtAuthGuard, FamilyRoleGuard, JwtModule],
})
export class AuthModule {}
