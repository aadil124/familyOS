export abstract class DocumentProcessingDispatcher {
  abstract dispatch(documentId: string): Promise<void>;
}
