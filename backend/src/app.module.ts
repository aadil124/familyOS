import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FamilyModule } from './family/family.module';
import { FamilyMemberModule } from './family-member/family-member.module';
import { DocumentsModule } from './documents/documents.module';
import { ReadinessModule } from './readiness/readiness.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { SharedModule } from './shared/shared.module';
import { PrismaModule } from './database/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    FamilyModule,
    FamilyMemberModule,
    DocumentsModule,
    ReadinessModule,
    NotificationsModule,
    AiModule,
    SharedModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
