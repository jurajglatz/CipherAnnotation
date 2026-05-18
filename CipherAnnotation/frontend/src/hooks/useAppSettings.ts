import { useCallback, useEffect, useState } from 'react';
import settingsService, { PublicSettings } from '@/services/settingsService';
import { useAuth } from './useAuth';

const defaults: PublicSettings = { autoContentGenerator: false };

export function useAppSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PublicSettings>(defaults);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) {
      setSettings(defaults);
      return;
    }
    setLoading(true);
    try {
      setSettings(await settingsService.getPublic());
    } catch {
      setSettings(defaults);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  return { settings, loading, reload };
}
