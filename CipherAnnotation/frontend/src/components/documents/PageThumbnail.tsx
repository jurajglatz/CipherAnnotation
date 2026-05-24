/**
 * PageThumbnail Component
 * Reusable page thumbnail with lazy loading and status indicator
 */

import React, { useState, useEffect } from 'react';
import { Page, Annotation } from '@/types';
import api from '@/services/api';
import annotationService from '@/services/annotationService';
import { captionColor } from '@/components/annotation/utils/captionColor';
import { CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';

interface PageThumbnailProps {
  page: Page;
  documentId: string;
  onClick?: () => void;
  isSelected?: boolean;
  showProcessingStatus?: boolean;
  showProcessed?: boolean;
  showAnnotations?: boolean;
  onDelete?: () => void;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({
  page,
  documentId,
  onClick,
  isSelected = false,
  showProcessingStatus = false,
  showProcessed = false,
  showAnnotations = false,
  onDelete,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const hasProcessedImage = !!page.processedImageUrl;
  const displayUrl = showProcessed ? (page.processedImageUrl ?? page.imageUrl) : page.imageUrl;

  useEffect(() => {
    if (!showAnnotations) {
      setAnnotations([]);
      return;
    }
    let cancelled = false;
    annotationService
      .list(page.id)
      .then((data) => {
        if (!cancelled) setAnnotations(data);
      })
      .catch(() => {
        if (!cancelled) setAnnotations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showAnnotations, page.id]);

  // Load image via authenticated request
  useEffect(() => {
    if (!displayUrl) return;

    setIsLoading(true);
    setHasError(false);
    setImageBlobUrl(null);

    let revoked = false;
    api.get(displayUrl, { responseType: 'blob' }).then((res) => {
      if (!revoked) {
        const url = URL.createObjectURL(res.data);
        setImageBlobUrl(url);
      }
    }).catch(() => {
      if (!revoked) setHasError(true);
    });

    return () => {
      revoked = true;
    };
  }, [displayUrl]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const getStatusIndicator = () => {
    if (hasProcessedImage) {
      return (
        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          <span>Processed</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
        <Clock className="w-3 h-3" />
        <span>Original</span>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`relative group bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-ink-900 shadow-lg' : 'hover:shadow-md'
      }`}
    >
      {/* Image Container */}
      <div
        className="relative w-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: page.width && page.height ? `${page.width} / ${page.height}` : '3 / 4' }}
      >
        {hasError ? (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-xs text-gray-500 text-center px-2">
              Failed to load
            </p>
          </div>
        ) : (
          <>
            {(isLoading || !imageBlobUrl) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )}
            {imageBlobUrl && (
              <img
                src={imageBlobUrl}
                alt={`Page ${page.pageNumber}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="w-full h-full object-contain"
              />
            )}
            {showAnnotations && annotations.length > 0 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${page.width} ${page.height}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {annotations.map((ann) => {
                  const stroke = captionColor(ann.captionName);
                  return (
                    <rect
                      key={ann.id}
                      x={ann.boundingBox.x}
                      y={ann.boundingBox.y}
                      width={ann.boundingBox.width}
                      height={ann.boundingBox.height}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={Math.max(page.width, page.height) / 400}
                    />
                  );
                })}
              </svg>
            )}
          </>
        )}

        {/* Page Number Overlay */}
        <div className="absolute bottom-2 right-2 bg-gray-900 text-white text-xs px-2 py-1 rounded font-semibold">
          {page.pageNumber}
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute top-2 left-2">
            <div className="w-6 h-6 bg-ink-900 rounded-full flex items-center justify-center shadow-sm">
              <CheckCircle className="w-5 h-5 text-parchment-50" />
            </div>
          </div>
        )}

        {/* Delete Button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete page"
            aria-label="Delete page"
            className="absolute top-2 right-2 p-1.5 bg-parchment-50/90 hover:bg-cipher-red text-cipher-red hover:text-parchment-50 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all pointer-events-none" />
      </div>

      {/* Footer */}
      <div className="p-3 space-y-2">
        {/* Dimensions */}
        <div className="text-xs text-gray-600">
          <p>{page.width}x{page.height}px</p>
          <p>{page.resolutionDPI} DPI</p>
        </div>

        {/* Processing Status */}
        {showProcessingStatus && (
          <div className="flex justify-center">
            {getStatusIndicator()}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageThumbnail;
