import { Injectable, Logger } from '@nestjs/common';
import { AiAnalysisDispatcher } from './ai-dispatcher.interface';
import { AiService } from '../ai.service';

@Injectable()
export class InMemoryAiDispatcher extends AiAnalysisDispatcher {
  private readonly logger = new Logger(InMemoryAiDispatcher.name);

  constructor(private readonly aiService: AiService) {
    super();
  }

  async dispatch(documentId: string): Promise<void> {
    this.logger.log(`Dispatching AI analysis processing for document: ${documentId}`);

    setImmediate(async () => {
      try {
        await this.aiService.executeAnalysis(documentId);
      } catch (error) {
        this.logger.error(`Error in background AI analysis for document ${documentId}: ${error.message}`, error.stack);
      }
    });
  }
}
