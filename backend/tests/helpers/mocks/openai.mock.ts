export const mockOpenAIService = {
  analyzeDocument: jest.fn().mockResolvedValue({
    documentType: 'passport',
    confidence: 0.99,
  }),
  generateResponse: jest.fn().mockResolvedValue('Mocked AI response'),
};
