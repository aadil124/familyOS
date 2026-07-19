import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiExtractionResult } from './ai-provider.interface';

@Injectable()
export class OpenAiProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async extractMetadata(ocrText: string): Promise<AiExtractionResult> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is not configured');
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini');

    const systemPrompt = `You are a document analyzer AI. Your task is to analyze the OCR text extracted from a user's uploaded document and return a structured JSON object.

Based on the text, you must classify the document into one of the following types:
- Passport
- PAN Card
- Aadhaar
- Driver's License
- Proof of Address (e.g. utility bill, rent agreement, bank statement showing address)
- Unknown (if none of the above are matched or if details are completely missing)

You must extract the following fields if they are found in the OCR text:
1. "detectedDocumentType": Choose one of: "Passport", "PAN Card", "Aadhaar", "Driver's License", "Proof of Address", "Unknown".
2. "nameOnDocument": The full name of the person whom the document belongs to. (For passport, concatenate Given Name and Surname if separated).
3. "addressOnDocument": The complete address if present (especially for Aadhaar, Driver's License, or Proof of Address). Null if not found.
4. "issuedDate": The date of issue formatted as "YYYY-MM-DD" if found. Null if not found.
5. "expiryDate": The date of expiry formatted as "YYYY-MM-DD" if found. Null if not found.
6. "confidenceScore": Float between 0.0 and 1.0 representing your confidence in this extraction.
7. "analysisSummary": A brief, one-sentence summary of the document (e.g., "Aadhaar card for Jane Doe successfully parsed.").
8. "extractedFields": A key-value object containing document-specific attributes:
   - For Passport: { "passportNumber": "..." }
   - For PAN Card: { "panNumber": "..." }
   - For Aadhaar: { "aadhaarNumber": "..." }
   - For Driver's License: { "driverLicenseNumber": "..." }
   - For Proof of Address: { "address": "..." }
   - For Unknown: {}

Strict Rules:
- Return ONLY a valid JSON object matching the described schema. Do not output any markdown block wrappers or comments.
- Do not make up or infer any details. If a field is not present in the text, return null (or an empty object for extractedFields).
- Standardize all dates to YYYY-MM-DD format. If a date is written as "DD/MM/YYYY" or "Birth Year: YYYY", convert it accordingly. If birth year is given, do not assume date or month unless explicitly written.
`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: ocrText },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
      }

      const data = (await response.json()) as any;
      const rawContent = data.choices[0].message.content.trim();

      // Parse JSON response
      let parsedResult: any;
      try {
        parsedResult = JSON.parse(rawContent);
      } catch (parseError) {
        this.logger.warn(`Failed to parse raw content directly: ${parseError.message}. Attempting regex cleanup.`);
        // Try regex cleaning if markdown blocks were returned
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw parseError;
        }
      }

      return {
        detectedDocumentType: parsedResult.detectedDocumentType || 'Unknown',
        extractedFields: parsedResult.extractedFields || {},
        nameOnDocument: parsedResult.nameOnDocument || undefined,
        addressOnDocument: parsedResult.addressOnDocument || undefined,
        issuedDate: parsedResult.issuedDate || undefined,
        expiryDate: parsedResult.expiryDate || undefined,
        confidenceScore: typeof parsedResult.confidenceScore === 'number' ? parsedResult.confidenceScore : 0.5,
        analysisSummary: parsedResult.analysisSummary || 'Extraction completed.',
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenAI metadata extraction failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  getProviderName(): string {
    return 'openai';
  }

  getProviderVersion(): string {
    return 'v1.0';
  }
}
