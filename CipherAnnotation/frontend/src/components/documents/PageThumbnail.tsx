/**
 * PageThumbnail Component
 * Reusable page thumbnail with lazy loading and status indicator
 */

import React, { useState, useEffect } from 'react';
import { Page, SectionAnnotation } from '@/types';
import api from '@/services/api';
import annotationService from '@/services/annotationService';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface PageThumbnailProps {
  page: Page;
  documentId: string;
  onClick?: () => void;
  isSelected?: boolean;
  showProcessingStatus?: boolean;
  showProcessed?: boolean;
  showAnnotations?: boolean;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({
  page,
  documentId,
  onClick,
  isSelected = false,
  showProcessingStatus = false,
  showProcessed = false,
  showAnnotations = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<SectionAnnotation[]>([]);

  const hasProcessedImage = !!page.processedImageUrl;
  const displayUrl = showProcessed ? (page.processedImageUrl ?? page.imageUrl) : page.imageUrl;

  useEffect(() => {
    if (!showAnnotations) {
      setAnnotations([]);
      return;
    }
    let cancelled = false;
    annotationService
      .getAnnotations(page.id)
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
                {annotations.flatMap((section) => [
                  <rect
                    key={`s-${section.id}`}
                    x={section.boundingBox.x}
                    y={section.boundingBox.y}
                    width={section.boundingBox.width}
                    height={section.boundingBox.height}
                    fill="#4338ca10"
                    stroke="#4338ca"
                    strokeWidth={Math.max(page.width, page.height) / 400}
                    strokeDasharray={`${Math.max(page.width, page.height) / 200},${Math.max(page.width, page.height) / 100}`}
                  />,
                  ...(section.pairAnnotations || []).flatMap((pair) => [
                    <rect
                      key={`p-${pair.id}`}
                      x={pair.boundingBox.x}
                      y={pair.boundingBox.y}
                      width={pair.boundingBox.width}
                      height={pair.boundingBox.height}
                      fill="#5a7a3a10"
                      stroke="#5a7a3a"
                      strokeWidth={Math.max(page.width, page.height) / 400}
                    />,
                    ...(pair.elementAnnotations || []).map((element) => (
                      <rect
                        key={`e-${element.id}`}
                        x={element.boundingBox.x}
                        y={element.boundingBox.y}
                        width={element.boundingBox.width}
                        height={element.boundingBox.height}
                        fill="#b91c1c10"
                        stroke="#b91c1c"
                        strokeWidth={Math.max(page.width, page.height) / 400}
                      />
                    )),
                  ]),
                ])}
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

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
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
