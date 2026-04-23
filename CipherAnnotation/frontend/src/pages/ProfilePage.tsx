/**
 * ProfilePage Component
 * User profile page
 */

import React from 'react';
import { User as UserIcon, Mail, Calendar, Shield } from 'lucide-react';
import { useAuth } from '@/hooks';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

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
    </div>
  );
};

export default ProfilePage;
