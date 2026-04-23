/**
 * Export service
 * Handles dataset export in various formats
 */

import api from './api';
import { ExportRequest } from '../types';

class ExportService {
  /**
   * Export dataset in COCO format
   * Returns a blob that can be downloaded
   */
  async exportCoco(data: ExportRequest): Promise<Blob> {
    const response = await api.post('/export/coco', data, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Export dataset in YOLO format
   * Returns a blob that can be downloaded
   */
  async exportYolo(data: ExportRequest): Promise<Blob> {
    const response = await api.post('/export/yolo', data, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Export dataset in TFRecord format (TensorFlow)
   * Returns a ZIP blob containing train.tfrecord, val.tfrecord and label_map.pbtxt
   */
  async exportTfRecord(data: ExportRequest): Promise<Blob> {
    const response = await api.post('/export/tfrecord', data, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string): Promise<{
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    downloadUrl?: string;
    error?: string;
  }> {
    const response = await api.get(`/export/${exportId}`);
    return response.data;
  }

  /**
   * Cancel export job
   */
  async cancelExport(exportId: string): Promise<void> {
    await api.post(`/export/${exportId}/cancel`);
  }

  /**
   * Helper to download blob as file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export default new ExportService();
