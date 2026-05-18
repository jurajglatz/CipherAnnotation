import api from './api';

export interface PublicSettings {
  autoContentGenerator: boolean;
}

export const SETTING_KEYS = {
  autoContentGenerator: 'AutoContentGenerator.Enabled',
} as const;

const settingsService = {
  async getPublic(): Promise<PublicSettings> {
    const { data } = await api.get<PublicSettings>('/settings/public');
    return data;
  },

  async getAllAdmin(): Promise<Record<string, string>> {
    const { data } = await api.get<Record<string, string>>('/admin/settings');
    return data;
  },

  async setAdmin(key: string, value: string): Promise<void> {
    await api.put(`/admin/settings/${encodeURIComponent(key)}`, { value });
  },
};

export default settingsService;
