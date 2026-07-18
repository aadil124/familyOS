import { Module, forwardRef } from '@nestjs/common';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { OcrRepository } from './ocr.repository';
import { MockOcrProvider } from './providers/mock-ocr.provider';
import { OcrProviderRegistry } from './providers/ocr-provider.registry';
import { DocumentProcessingDispatcher } from './dispatchers/processing-dispatcher.interface';
import { InMemoryDispatcher } from './dispatchers/in-memory-dispatcher';
import { PrismaModule } from '../database/prisma.module';
import { FamilyModule } from '../family/family.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    PrismaModule,
    FamilyModule,
    forwardRef(() => DocumentsModule),
  ],
  controllers: [OcrController],
  providers: [
    OcrService,
    OcrRepository,
    MockOcrProvider,
    OcrProviderRegistry,
    {
      provide: DocumentProcessingDispatcher,
      useClass: InMemoryDispatcher,
    },
  ],
  exports: [
    OcrService,
    OcrRepository,
    DocumentProcessingDispatcher,
  ],
})
export class OcrModule {}
