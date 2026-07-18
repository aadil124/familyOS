import { Injectable } from '@nestjs/common';
import { AiProvider, AiExtractionResult } from './ai-provider.interface';

@Injectable()
export class OpenAiProvider implements AiProvider {
  async extractMetadata(ocrText: string): Promise<AiExtractionResult> {
    throw new Error('Not implemented');
  }

  getProviderName(): string {
    return 'openai';
  }

  getProviderVersion(): string {
    return 'v1.0';
  }
}
