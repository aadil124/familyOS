import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { FamilyModule } from './family/family.module';
import { DocumentsModule } from './documents/documents.module';
import { ReadinessModule } from './readiness/readiness.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HealthModule,
    AuthModule,
    FamilyModule,
    DocumentsModule,
    ReadinessModule,
    NotificationsModule,
    AiModule,
    SharedModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
