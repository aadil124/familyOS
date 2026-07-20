import { forwardRef, Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { ChatController } from './chat.controller';
import { AiService } from './ai.service';
import { ChatSessionService } from './chat-session.service';
import { ContextBuilderService } from './context-builder.service';
import { AiRepository } from './ai.repository';
import { ChatRepository } from './chat.repository';
import { MockAiProvider } from './providers/mock-ai.provider';
import { OpenAiProvider } from './providers/openai-ai.provider';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { AiAnalysisDispatcher } from './dispatchers/ai-dispatcher.interface';
import { InMemoryAiDispatcher } from './dispatchers/in-memory-ai-dispatcher';
import { PrismaModule } from '../database/prisma.module';
import { FamilyModule } from '../family/family.module';
import { FamilyMemberModule } from '../family-member/family-member.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OcrRepository } from '../ocr/ocr.repository';

@Module({
  imports: [
    PrismaModule,
    FamilyModule,
    FamilyMemberModule,
    NotificationsModule,
    forwardRef(() => DocumentsModule),
  ],
  controllers: [AiController, ChatController],
  providers: [
    AiService,
    ChatSessionService,
    ContextBuilderService,
    AiRepository,
    ChatRepository,
    OcrRepository,
    MockAiProvider,
    OpenAiProvider,
    AiProviderRegistry,
    {
      provide: AiAnalysisDispatcher,
      useClass: InMemoryAiDispatcher,
    },
  ],
  exports: [
    AiService,
    ChatSessionService,
    ContextBuilderService,
    AiRepository,
    ChatRepository,
    AiAnalysisDispatcher,
  ],
})
export class AiModule { }
