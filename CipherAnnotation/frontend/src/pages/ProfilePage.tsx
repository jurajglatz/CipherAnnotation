/**
 * ProfilePage Component
 * User profile page
 */

import React, { useEffect, useState } from 'react';
import { User as UserIcon, Mail, Calendar, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks';
import settingsService, { SETTING_KEYS } from '@/services/settingsService';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [autoContentEnabled, setAutoContentEnabled] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setAdminLoading(true);
    settingsService
      .getAllAdmin()
      .then((all) => {
        if (cancelled) return;
        setAutoContentEnabled(all[SETTING_KEYS.autoContentGenerator] === 'true');
      })
      .catch(() => !cancelled && setAdminError('Failed to load settings'))
      .finally(() => !cancelled && setAdminLoading(false));
    return () => { cancelled = true; };
  }, [isAdmin]);

  const toggleAutoContent = async () => {
    const next = !autoContentEnabled;
    setAdminError(null);
    setAutoContentEnabled(next);
    try {
      await settingsService.setAdmin(SETTING_KEYS.autoContentGenerator, String(next));
    } catch {
      setAutoContentEnabled(!next);
      setAdminError('Failed to update setting');
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-ink-900/60 font-serif italic">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink-900 leading-tight mb-8">
        Your <em className="italic font-normal text-sepia-700">profile</em>
      </h1>

      <div className="bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/20 rounded-lg shadow-sm overflow-hidden">
        {/* Profile Header */}
        <div className="p-7 border-b border-sepia-600/20">
          <div className="flex items-start gap-6">
            {user.avatarUri ? (
              <img
                src={user.avatarUri}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-sepia-600/30 shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-ink-900 text-parchment-50 flex items-center justify-center shadow-sm">
                <span className="font-serif text-3xl font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="font-serif text-3xl font-semibold text-ink-900 leading-tight">
                {user.name}
              </h2>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ink-900/5 border border-sepia-600/30 text-xs font-semibold tracking-wider uppercase text-sepia-700">
                <Shield className="w-3 h-3" />
                {user.role}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="p-7 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-ink-900/5 border border-sepia-600/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-sepia-700" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-sepia-700">
                Email
              </p>
              <p className="text-ink-900 font-medium mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-ink-900/5 border border-sepia-600/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-sepia-700" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-sepia-700">
                Member Since
              </p>
              <p className="text-ink-900 font-medium mt-0.5">
                {new Date(user.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-8 bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/20 rounded-lg shadow-sm overflow-hidden">
          <div className="p-7 border-b border-sepia-600/20">
            <h2 className="font-serif text-2xl font-semibold text-ink-900 leading-tight">
              Admin <em className="italic font-normal text-sepia-700">settings</em>
            </h2>
            <p className="mt-1 text-sm text-ink-900/60">
              These toggles affect every user of the application.
            </p>
          </div>

          <div className="p-7 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-ink-900/5 border border-sepia-600/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-sepia-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-wider uppercase text-sepia-700">
                      Auto content generator
                    </p>
                    <p className="text-ink-900 font-medium mt-0.5">
                      Use AI (Gemini) to suggest the <code>content</code> field for symbols
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoContentEnabled}
                    onClick={toggleAutoContent}
                    disabled={adminLoading}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-sepia-600 focus:ring-offset-2 disabled:opacity-50 ${
                      autoContentEnabled ? 'bg-sepia-700' : 'bg-ink-900/20'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-parchment-50 shadow ring-0 transition-transform ${
                        autoContentEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {adminError && (
                  <p className="mt-2 text-sm text-red-700">{adminError}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
