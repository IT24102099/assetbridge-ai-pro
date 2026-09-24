import apiClient from '../api';
import { ApiResponse } from '../../types/auth';

export interface SourceCitation {
  title: string;
  document_id: string;
  domain: string;
  section?: string;
  relevance_score: number;
  source_type: string;
  download_url?: string;
}

export interface AiChatMessage {
  role: 'user' | 'ai' | 'assistant' | 'system';
  content: string;
  sources?: SourceCitation[];
  domain_used?: string;
}

export interface AiChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
  asset_id?: string;
  incident_id?: string;
  domain_hint?: string;
}

export interface AiChatResponse {
  answer: string;
  domain_used: string;
  sources: SourceCitation[];
  suggested_actions: string[];
  provider_used: string;
  model_used: string;
}

export interface RagDocument {
  document_id: string;
  title: string;
  domain: string;
  document_type: string;
  file_path: string;
  file_size_bytes: number;
  chunks_count: number;
  tags: string[];
}

export interface DownloadedDocResult {
  blob: Blob;
  filename: string;
}

export const aiApi = {
  sendChatMessage: async (data: AiChatRequest): Promise<ApiResponse<AiChatResponse>> => {
    const response = await apiClient.post<ApiResponse<AiChatResponse>>('/ai/chat', data);
    return response.data;
  },

  getDocuments: async (): Promise<ApiResponse<RagDocument[]>> => {
    const response = await apiClient.get<ApiResponse<RagDocument[]>>('/ai/documents');
    return response.data;
  },

  downloadDocument: async (documentId: string, fallbackTitle?: string): Promise<DownloadedDocResult> => {
    const response = await apiClient.get(`/ai/documents/${documentId}/download`, {
      responseType: 'blob',
    });

    let filename = '';
    const headers = response.headers as Record<string, any> | undefined;
    const disposition = headers ? (headers['content-disposition'] || (typeof headers.get === 'function' ? headers.get('content-disposition') : undefined)) : undefined;
    if (disposition && typeof disposition === 'string') {
      // Check for RFC 5987 filename*
      const starMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (starMatch && starMatch[1]) {
        try {
          filename = decodeURIComponent(starMatch[1]);
        } catch {
          filename = starMatch[1];
        }
      } else {
        // Standard filename="..."
        const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
        if (match && match[1]) {
          filename = match[1].trim();
        }
      }
    }

    if (!filename) {
      const baseName = fallbackTitle ? fallbackTitle.replace(/\s+/g, '_') : documentId.replace(/-/g, '_');
      filename = `${baseName}.pdf`;
    }

    if (!filename.toLowerCase().endsWith('.pdf')) {
      filename += '.pdf';
    }

    // Ensure blob is typed as application/pdf
    const pdfBlob = new Blob([response.data], { type: 'application/pdf' });

    return {
      blob: pdfBlob,
      filename,
    };
  },

  downloadDocumentUrl: (documentId: string): string => {
    return `/api/ai/documents/${documentId}/download`;
  }
};

