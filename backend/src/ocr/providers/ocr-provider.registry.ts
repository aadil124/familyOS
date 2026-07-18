import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OcrProvider } from './ocr-provider.interface';
import { MockOcrProvider } from './mock-ocr.provider';

@Injectable()
export class OcrProviderRegistry {
  private readonly providers = new Map<string, OcrProvider>();

  constructor(
    private readonly configService: ConfigService,
    private readonly mockOcrProvider: MockOcrProvider,
  ) {
    this.registerProvider(this.mockOcrProvider);
  }

  registerProvider(provider: OcrProvider): void {
    this.providers.set(provider.getProviderName().toLowerCase(), provider);
  }

  getActiveProvider(): OcrProvider {
    const configuredProvider = this.configService.get<string>('OCR_PROVIDER', 'mock').toLowerCase();
    const provider = this.providers.get(configuredProvider);
    if (!provider) {
      throw new BadRequestException(`OCR Provider "${configuredProvider}" is not registered`);
    }
    return provider;
  }
}
