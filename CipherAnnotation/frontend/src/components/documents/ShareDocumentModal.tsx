/**
 * ShareDocumentModal Component
 * Modal to share a document with other users
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { DocumentShare, PermissionType } from '@/types';
import { documentService, userService } from '@/services';
import type { UserSearchResult } from '@/services/userService';
import { Modal, LoadingSpinner } from '@/components/shared';

interface ShareDocumentModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({
  documentId,
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<PermissionType>('Read');
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const suppressNextSearchRef = useRef(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch existing shares on modal open
  useEffect(() => {
    if (isOpen) {
      fetchShares();
    } else {
      setEmail('');
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightIndex(-1);
    }
  }, [isOpen, documentId]);

  // Debounced user search
  useEffect(() => {
    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return;
    }

    const trimmed = email.trim();
    if (trimmed.length < 2) {
      searchAbortRef.current?.abort();
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current?.abort();
    searchAbortRef.current = controller;

    const handle = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await userService.search(trimmed, 10, controller.signal);
        if (!controller.signal.aborted) {
          // Hide users we have already shared with
          const sharedIds = new Set(shares.map((s) => s.userId));
          setSuggestions(results.filter((u) => !sharedIds.has(u.id)));
          setShowSuggestions(true);
          setHighlightIndex(-1);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [email, shares]);

  // Close suggestions on outside click
  useEffect(() => {
    if (!showSuggestions) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showSuggestions]);

  const selectSuggestion = (user: UserSearchResult) => {
    suppressNextSearchRef.current = true;
    setEmail(user.email);
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightIndex(-1);
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const fetchShares = async () => {
    try {
      setIsLoadingShares(true);
      const data = await documentService.getShares(documentId);
      setShares(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch shares';
      toast.error(message);
    } finally {
      setIsLoadingShares(false);
    }
  };

  // Handle share
  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setIsSharing(true);
      const newShare = await documentService.shareDocument(
        documentId,
        email,
        permission
      );

      setShares((prev) => [...prev, newShare]);
      setEmail('');
      setPermission('Read');
      toast.success('Document shared successfully');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to share document';
      toast.error(message);
    } finally {
      setIsSharing(false);
    }
  };

  // Handle remove share
  const handleRemoveShare = async (shareId: string) => {
    try {
      setIsRemoving(shareId);
      await documentService.removeShare(documentId, shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      toast.success('Share removed');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove share';
      toast.error(message);
    } finally {
      setIsRemoving(null);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Document" size="lg">
      <div className="space-y-6">
        {/* Share Form */}
        <form onSubmit={handleShare} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Share with Others
          </h3>

          <div className="space-y-3">
            {/* Email Input + autocomplete */}
            <div ref={containerRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name or Email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={handleEmailKeyDown}
                placeholder="Start typing a name or email…"
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSharing}
              />

              {showSuggestions && email.trim().length >= 2 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {isSearching && suggestions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
                  ) : suggestions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No matching users</div>
                  ) : (
                    suggestions.map((u, idx) => (
                      <button
                        type="button"
                        key={u.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectSuggestion(u);
                        }}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-3 ${
                          idx === highlightIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        {u.avatarUri ? (
                          <img
                            src={u.avatarUri}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Permission Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Permission
              </label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as PermissionType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSharing}
              >
                <option value="Read">Read Only</option>
                <option value="Edit">Can Edit</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSharing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {isSharing ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Current Shares */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Shared With
          </h3>

          {isLoadingShares ? (
            <div className="py-8">
              <LoadingSpinner size="sm" fullHeight={false} />
            </div>
          ) : shares.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Not shared with anyone yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {share.userEmail}
                    </p>
                    <p className="text-xs text-gray-500">
                      {share.permission === 'Read' ? 'Read Only' : 'Can Edit'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveShare(share.id)}
                    disabled={isRemoving === share.id}
                    className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove share"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareDocumentModal;
