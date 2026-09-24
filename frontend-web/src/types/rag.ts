export interface RagDocument {
  id: string;
  title: string;
  category: string;
  summary: string;
  sourceType: 'Manual' | 'Guide' | 'Standard' | 'Policy';
  downloadUrl?: string;
  tags: string[];
}

export interface AiInsightResponse {
  insights: string[];
  recommendedActions: string[];
  safetyGuideline: string;
  relevantDocuments: RagDocument[];
}
