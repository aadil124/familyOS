export interface AiExtractionResult {
  detectedDocumentType: string;
  extractedFields: any;
  nameOnDocument?: string;
  addressOnDocument?: string;
  issuedDate?: string;
  expiryDate?: string;
  confidenceScore: number;
  analysisSummary: string;
}

export interface AiProvider {
  extractMetadata(ocrText: string): Promise<AiExtractionResult>;
  getProviderName(): string;
  getProviderVersion(): string;
}
