/**
 * Symbol service
 * Handles canonical Symbol entities: list/search/CRUD/image/occurrences.
 */

import api from './api';
import type {
  RecognizeSymbolResponse,
  Symbol,
  SymbolOccurrence,
  SymbolScope,
  SymbolSuggestion,
  UnlinkedSymbolAnnotation,
} from '../types';

interface ListParams {
  scope?: SymbolScope;
  contentSearch?: string;
  /** Comma-joined when passed to the backend. */
  documentIds?: string[];
  onlyUncaptioned?: boolean;
  take?: number;
  skip?: number;
}

function serializeListParams(
  params: ListParams,
): Record<string, string | number | boolean | undefined> {
  return {
    scope: params.scope,
    contentSearch: params.contentSearch,
    documentIds: params.documentIds && params.documentIds.length > 0
      ? params.documentIds.join(',')
      : undefined,
    onlyUncaptioned: params.onlyUncaptioned || undefined,
    take: params.take,
    skip: params.skip,
  };
}

class SymbolService {
  async list(params: ListParams = {}): Promise<Symbol[]> {
    const response = await api.get<Symbol[]>('/symbols', { params: serializeListParams(params) });
    return response.data;
  }

  async listUnlinkedAnnotations(params: ListParams = {}): Promise<UnlinkedSymbolAnnotation[]> {
    const response = await api.get<UnlinkedSymbolAnnotation[]>('/symbols/unlinked-annotations', {
      params: serializeListParams(params),
    });
    return response.data;
  }

  async getById(id: string): Promise<Symbol> {
    const response = await api.get<Symbol>(`/symbols/${id}`);
    return response.data;
  }

  async getSuggestions(content: string | null | undefined, take = 6): Promise<SymbolSuggestion[]> {
    const response = await api.get<SymbolSuggestion[]>('/symbols/suggestions', {
      params: { content: content ?? '', take },
    });
    return response.data;
  }

  async create(pngBlob: Blob, content?: string | null, fileName = 'symbol.png'): Promise<Symbol> {
    const fd = new FormData();
    fd.append('pngFile', pngBlob, fileName);
    if (content) fd.append('content', content);
    const response = await api.post<Symbol>('/symbols', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async updateImage(id: string, pngBlob: Blob, fileName = 'symbol.png'): Promise<Symbol> {
    const fd = new FormData();
    fd.append('pngFile', pngBlob, fileName);
    const response = await api.put<Symbol>(`/symbols/${id}/image`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async update(id: string, content: string | null): Promise<Symbol> {
    const response = await api.put<Symbol>(`/symbols/${id}`, { content });
    return response.data;
  }

  async renameCaption(id: string, content: string | null): Promise<RenameCaptionResult> {
    const response = await api.put<RenameCaptionResult>(`/symbols/${id}/rename-caption`, { content });
    return response.data;
  }

  async renameCaptionByContent(
    oldContent: string,
    newContent: string | null,
  ): Promise<RenameCaptionResult> {
    const response = await api.put<RenameCaptionResult>('/symbols/rename-caption', {
      oldContent,
      newContent,
    });
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/symbols/${id}`);
  }

  getImageUrl(id: string): string {
    return `/api/symbols/${id}/image`;
  }

  async getOccurrences(id: string, take = 100, skip = 0): Promise<SymbolOccurrence[]> {
    const response = await api.get<SymbolOccurrence[]>(`/symbols/${id}/occurrences`, {
      params: { take, skip },
    });
    return response.data;
  }

  async recognize(id: string): Promise<RecognizeSymbolResponse> {
    const response = await api.post<RecognizeSymbolResponse>(`/symbols/${id}/recognize`);
    return response.data;
  }

  async autoFillContent(scope: 'Page' | 'Document', id: string): Promise<AutoFillContentResult> {
    const response = await api.post<AutoFillContentResult>('/symbols/auto-fill-content', { scope, id });
    return response.data;
  }
}

export interface AutoFillContentItem {
  symbolId: string;
  suggestion: string | null;
  status: string;
}

export interface RenameCaptionResult {
  oldContent: string | null;
  newContent: string | null;
  updated: number;
  symbolsUpdated: number;
  annotationsUpdated: number;
}

export interface AutoFillContentResult {
  candidates: number;
  filled: number;
  skippedNotOwner: number;
  skippedNoSuggestion: number;
  items: AutoFillContentItem[];
}

export default new SymbolService();
