import { Injectable, Logger } from '@nestjs/common';
import { DocumentProcessingDispatcher } from './processing-dispatcher.interface';
import { OcrService } from '../ocr.service';

@Injectable()
export class InMemoryDispatcher extends DocumentProcessingDispatcher {
  private readonly logger = new Logger(InMemoryDispatcher.name);

  constructor(private readonly ocrService: OcrService) {
    super();
  }

  async dispatch(documentId: string): Promise<void> {
    this.logger.log(`Dispatching OCR processing for document: ${documentId}`);
    
    setImmediate(async () => {
      try {
        await this.ocrService.executeOcr(documentId);
      } catch (error) {
        this.logger.error(`Error in background OCR processing for document ${documentId}: ${error.message}`, error.stack);
      }
    });
  }
}
