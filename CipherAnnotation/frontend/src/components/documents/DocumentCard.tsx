/**
 * DocumentCard Component
 * Reusable document card with metadata and action buttons
 */

import React, { useState, useEffect } from 'react';
import { Eye, Edit3, Share2, Trash2, Lock, Globe, FileText, Copy } from 'lucide-react';
import { Document } from '@/types';
import api from '@/services/api';

interface DocumentCardProps {
  document: Document;
  onView: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  onShare?: (doc: Document) => void;
  onDuplicate?: (doc: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onView,
  onEdit,
  onDelete,
  onShare,
  onDuplicate,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [thumbnailBlobUrl, setThumbnailBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!document.thumbnailUrl) return;

    let revoked = false;
    api.get(document.thumbnailUrl, { responseType: 'blob' }).then((res) => {
      if (!revoked) {
        setThumbnailBlobUrl(URL.createObjectURL(res.data));
      }
    }).catch(() => {});

    return () => {
      revoked = true;
      if (thumbnailBlobUrl) URL.revokeObjectURL(thumbnailBlobUrl);
    };
  }, [document.thumbnailUrl]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="group bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/20 rounded-lg shadow-sm hover:shadow-xl hover:shadow-ink-900/10 hover:border-sepia-600/40 hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col h-full"
    >
      {/* Thumbnail Container */}
      <div className="relative bg-parchment-100 h-44 flex items-center justify-center overflow-hidden border-b border-sepia-600/20">
        {thumbnailBlobUrl ? (
          <img
            src={thumbnailBlobUrl}
            alt={document.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText className="w-16 h-16 text-sepia-600/40" />
        )}

        {/* Visibility Badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-parchment-50/95 border border-sepia-600/30 rounded-full px-2.5 py-1 shadow-sm">
          {document.visibility === 'Private' ? (
            <>
              <Lock className="w-3 h-3 text-sepia-700" />
              <span className="text-xs font-semibold text-sepia-700 tracking-wider uppercase">Private</span>
            </>
          ) : (
            <>
              <Globe className="w-3 h-3 text-ink-900" />
              <span className="text-xs font-semibold text-ink-900 tracking-wider uppercase">Public</span>
            </>
          )}
        </div>

        {/* Page Count Badge */}
        <div className="absolute bottom-2 left-2 bg-ink-900 text-parchment-50 rounded-full px-3 py-1 text-xs font-semibold">
          {document.pageCount} {document.pageCount === 1 ? 'page' : 'pages'}
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-grow p-5">
        {/* Title */}
        <h3 className="font-serif text-xl font-semibold text-ink-900 line-clamp-2 mb-2 leading-tight">
          {document.title}
        </h3>

        {/* Description */}
        {document.description && (
          <p className="text-sm text-ink-900/70 line-clamp-2 mb-3 leading-relaxed">
            {document.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex-grow mb-3 space-y-1 text-xs text-sepia-700">
          {document.author && (
            <p>
              <span className="font-semibold uppercase tracking-wider">Author:</span> <span className="text-ink-900/80">{document.author}</span>
            </p>
          )}
          {document.language && (
            <p>
              <span className="font-semibold uppercase tracking-wider">Language:</span> <span className="text-ink-900/80">{document.language}</span>
            </p>
          )}
          {document.originCountry && (
            <p>
              <span className="font-semibold uppercase tracking-wider">Country:</span> <span className="text-ink-900/80">{document.originCountry}</span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-sepia-600/20 pt-3">
          <p className="text-xs text-sepia-700/80 mb-3 italic">
            Created {formatDate(document.createdAt)}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onView(document)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-ink-900 hover:bg-primary-700 text-parchment-50 rounded-md transition-colors text-xs font-semibold"
              title="View document"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">View</span>
            </button>
            {onEdit && (
            <button
              onClick={() => onEdit(document)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-transparent hover:bg-ink-900/5 text-ink-900 border border-sepia-600/30 hover:border-ink-900/60 rounded-md transition-colors text-xs font-semibold"
              title="Edit document"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            )}
            {onDuplicate && (
            <button
              onClick={() => onDuplicate(document)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-transparent hover:bg-ink-900/5 text-ink-900 border border-sepia-600/30 hover:border-ink-900/60 rounded-md transition-colors text-xs font-semibold"
              title="Duplicate document"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Duplicate</span>
            </button>
            )}
            {onShare && (
            <button
              onClick={() => onShare(document)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-transparent hover:bg-ink-900/5 text-ink-900 border border-sepia-600/30 hover:border-ink-900/60 rounded-md transition-colors text-xs font-semibold"
              title="Share document"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
            )}
            {onDelete && (
            <button
              onClick={() => onDelete(document)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-transparent hover:bg-cipher-red/10 text-cipher-red border border-cipher-red/30 hover:border-cipher-red/60 rounded-md transition-colors text-xs font-semibold"
              title="Delete document"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
