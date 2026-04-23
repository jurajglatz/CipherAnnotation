/**
 * Symbol service
 * Handles symbol management (CRUD operations)
 */

import api from './api';
import { Symbol } from '../types';

class SymbolService {
  /**
   * Get all symbols, optionally filtered by code
   */
  async getSymbols(code?: string): Promise<Symbol[]> {
    const params = code ? { code } : {};
    const response = await api.get<Symbol[]>('/symbols', { params });
    return response.data;
  }

  /**
   * Get symbol by ID
   */
  async getSymbol(id: string): Promise<Symbol> {
    const response = await api.get<Symbol>(`/symbols/${id}`);
    return response.data;
  }

  /**
   * Create new symbol with image upload
   * @param formData FormData with 'image' and 'code' fields
   */
  async createSymbol(formData: FormData): Promise<Symbol> {
    const response = await api.post<Symbol>('/symbols', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Update symbol
   */
  async updateSymbol(id: string, data: Partial<Symbol>): Promise<Symbol> {
    const response = await api.put<Symbol>(`/symbols/${id}`, data);
    return response.data;
  }

  /**
   * Delete symbol
   */
  async deleteSymbol(id: string): Promise<void> {
    await api.delete(`/symbols/${id}`);
  }

  /**
   * Get symbol preview image
   */
  async getSymbolImage(id: string): Promise<Blob> {
    const response = await api.get(`/symbols/${id}/image`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Search symbols by code
   */
  async searchSymbols(query: string): Promise<Symbol[]> {
    const response = await api.get<Symbol[]>('/symbols/search', {
      params: { q: query },
    });
    return response.data;
  }
}

export default new SymbolService();
