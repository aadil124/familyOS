export interface OcrExtractionResult {
  text: string;
  confidence: number;
  provider: string;
  providerVersion: string;
}

export interface OcrProvider {
  extractText(imageUrl: string): Promise<OcrExtractionResult>;
  getProviderName(): string;
  getProviderVersion(): string;
}
