export abstract class AiAnalysisDispatcher {
  abstract dispatch(documentId: string): Promise<void>;
}
