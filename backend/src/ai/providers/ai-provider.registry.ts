import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai-provider.interface';
import { MockAiProvider } from './mock-ai.provider';
import { OpenAiProvider } from './openai-ai.provider';

@Injectable()
export class AiProviderRegistry {
  private readonly providers = new Map<string, AiProvider>();

  constructor(
    private readonly configService: ConfigService,
    private readonly mockProvider: MockAiProvider,
    private readonly openAiProvider: OpenAiProvider,
  ) {
    this.registerProvider(this.mockProvider);
    this.registerProvider(this.openAiProvider);
  }

  registerProvider(provider: AiProvider): void {
    this.providers.set(provider.getProviderName().toLowerCase(), provider);
  }

  getActiveProvider(): AiProvider {
    const configuredProvider = this.configService.get<string>('AI_PROVIDER', 'mock').toLowerCase();
    const provider = this.providers.get(configuredProvider);
    if (!provider) {
      throw new BadRequestException(`AI Provider "${configuredProvider}" is not registered`);
    }
    return provider;
  }
}
