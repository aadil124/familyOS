import { Injectable } from '@nestjs/common';
import { OcrProvider, OcrExtractionResult } from './ocr-provider.interface';

@Injectable()
export class MockOcrProvider implements OcrProvider {
  async extractText(imageUrl: string): Promise<OcrExtractionResult> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    let text = 'MOCK DOCUMENT TEXT\nName: Jane Doe\nDocument Number: A1234567\nExpiry Date: 2030-12-31\nDate of Birth: 1990-01-01';
    
    const lowercaseUrl = imageUrl.toLowerCase();
    if (lowercaseUrl.includes('passport')) {
      text = 'PASSPORT REPUBLIC OF INDIA\nPassport No: A1234567\nGiven Name: Jane\nSurname: Doe\nDate of Birth: 01/01/1990\nExpiry Date: 31/12/2030';
    } else if (lowercaseUrl.includes('address') || lowercaseUrl.includes('utility') || lowercaseUrl.includes('bill')) {
      text = 'UTILITY BILL\nName: Jane Doe\nAddress: 123 Main Street, New Delhi, 110001\nBill Date: 15/07/2026';
    }

    return {
      text,
      confidence: 0.95,
      provider: this.getProviderName(),
      providerVersion: this.getProviderVersion(),
    };
  }

  getProviderName(): string {
    return 'mock';
  }

  getProviderVersion(): string {
    return 'v1.0';
  }
}
