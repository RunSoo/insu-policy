const API_URL = import.meta.env.VITE_DIFY_API_URL || '/api/dify/v1';
const API_KEY = import.meta.env.VITE_DIFY_API_KEY || '';

// --- Datasets (Knowledge Bases) ---
export interface Dataset {
  id: string;
  name: string;
  description: string;
  created_at: number;
  word_count: number;
  document_count: number;
}

export interface DatasetResponse {
  data: Dataset[];
  has_more: boolean;
  limit: number;
  total: number;
  page: number;
}

export async function getDatasets(page: number = 1, limit: number = 20): Promise<DatasetResponse> {
  const response = await fetch(`${API_URL}/datasets?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch datasets: ${response.status}`);
  }

  return response.json();
}

// --- Documents ---
export interface Document {
  id: string;
  name: string;
  created_at: number;
  word_count: number;
  display_status: string;
}

export interface DocumentResponse {
  data: Document[];
  has_more: boolean;
  limit: number;
  total: number;
  page: number;
}

export async function getDocuments(datasetId: string, page: number = 1, limit: number = 20): Promise<DocumentResponse> {
  const response = await fetch(`${API_URL}/datasets/${datasetId}/documents?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.status}`);
  }

  return response.json();
}

export async function deleteDocument(datasetId: string, documentId: string): Promise<void> {
  const response = await fetch(`${API_URL}/datasets/${datasetId}/documents/${documentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete document: ${response.status}`);
  }
}

export async function createDocumentByText(datasetId: string, name: string, text: string): Promise<void> {
  const response = await fetch(`${API_URL}/datasets/${datasetId}/document/create_by_text`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      text,
      indexing_technique: 'high_quality',
      process_rule: {
        mode: 'automatic'
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to upload document: ${response.status} - ${errorData}`);
  }
}
