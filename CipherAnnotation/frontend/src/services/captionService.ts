import api from './api';
import { Caption } from '../types';

class CaptionService {
  async list(documentId: string): Promise<Caption[]> {
    const res = await api.get<Caption[]>(`/documents/${documentId}/captions`);
    return res.data;
  }

  async create(documentId: string, name: string): Promise<Caption> {
    const res = await api.post<Caption>(`/documents/${documentId}/captions`, { name });
    return res.data;
  }

  async rename(documentId: string, captionId: string, name: string): Promise<Caption> {
    const res = await api.put<Caption>(
      `/documents/${documentId}/captions/${captionId}`,
      { name },
    );
    return res.data;
  }

  async remove(documentId: string, captionId: string): Promise<void> {
    await api.delete(`/documents/${documentId}/captions/${captionId}`);
  }
}

export default new CaptionService();
