import { Injectable } from '@nestjs/common';
import { AiProvider, AiExtractionResult } from './ai-provider.interface';

@Injectable()
export class MockAiProvider implements AiProvider {
  async extractMetadata(ocrText: string): Promise<AiExtractionResult> {
    // Simulate slight processing delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const cleanText = ocrText.trim();
    
    let nameOnDocument = 'Jane Doe'; 
    const givenNameMatch = cleanText.match(/Given Name:\s*([A-Za-z ]+)/i);
    const surnameMatch = cleanText.match(/Surname:\s*([A-Za-z ]+)/i);
    if (givenNameMatch && surnameMatch) {
      nameOnDocument = `${givenNameMatch[1].trim()} ${surnameMatch[1].trim()}`;
    } else {
      const nameMatch = cleanText.match(/(?:Name|NameOnDocument):\s*([A-Za-z ]+)/i);
      if (nameMatch && nameMatch[1]) {
        nameOnDocument = nameMatch[1].trim();
      }
    }

    let detectedDocumentType = 'Unknown';
    let extractedFields: any = {};
    let addressOnDocument: string | undefined;
    let issuedDate: string | undefined;
    let expiryDate: string | undefined;
    let confidenceScore = 0.85;
    let analysisSummary = 'Generic document analyzed.';

    const uppercaseOcr = cleanText.toUpperCase();
    if (uppercaseOcr.includes('PASSPORT')) {
      detectedDocumentType = 'Passport';
      confidenceScore = 0.98;
      analysisSummary = 'Standard passport document identified.';
      
      const passportNoMatch = cleanText.match(/(?:Passport No|Passport Number):\s*([A-Z0-9]+)/i);
      extractedFields = {
        passportNumber: passportNoMatch ? passportNoMatch[1].trim() : 'A1234567',
      };
      
      const expiryMatch = cleanText.match(/(?:Expiry Date):\s*([0-9\/\-]+)/i);
      expiryDate = expiryMatch ? expiryMatch[1].trim() : '31/12/2030';

      const issuedMatch = cleanText.match(/(?:Issued Date|Issue Date):\s*([0-9\/\-]+)/i);
      issuedDate = issuedMatch ? issuedMatch[1].trim() : '01/01/2020';

    } else if (uppercaseOcr.includes('UTILITY BILL') || uppercaseOcr.includes('BILL') || uppercaseOcr.includes('ADDRESS')) {
      detectedDocumentType = 'Proof of Address';
      confidenceScore = 0.95;
      analysisSummary = 'Utility bill document processed successfully.';

      const addressMatch = cleanText.match(/(?:Address):\s*([A-Za-z0-9\s,\-]+)/i);
      addressOnDocument = addressMatch ? addressMatch[1].replace(/\n/g, ' ').trim() : '123 Main Street, New Delhi, 110001';
      extractedFields = {
        address: addressOnDocument,
      };

      const billDateMatch = cleanText.match(/(?:Bill Date):\s*([0-9\/\-]+)/i);
      issuedDate = billDateMatch ? billDateMatch[1].trim() : '15/07/2026';
    }

    return {
      detectedDocumentType,
      extractedFields,
      nameOnDocument,
      addressOnDocument,
      issuedDate,
      expiryDate,
      confidenceScore,
      analysisSummary,
    };
  }

  getProviderName(): string {
    return 'mock';
  }

  getProviderVersion(): string {
    return 'v1.0';
  }
}
