/**
 * DocumentDetailPage Component
 * Document detail view with page thumbnails and preprocessing controls
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Edit3,
  Share2,
  Trash2,
  Plus,
  Grid3x3,
  List,
  SquareDashed,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Document, ExportFormat, Page } from '@/types';
import { documentService, exportService, pageService } from '@/services';
import { LoadingSpinner, Modal, ConfirmDialog } from '@/components/shared';
import PageThumbnail from '@/components/documents/PageThumbnail';
import { ShareDocumentModal } from '@/components/documents/ShareDocumentModal';
import { AddPagesModal } from '@/components/documents/AddPagesModal';

type ViewMode = 'grid' | 'list';

export const DocumentDetailPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditRoute = location.pathname.endsWith('/edit');

  // State
  const [document, setDocument] = useState<Document | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    author: '',
    language: '',
    originCountry: '',
    visibility: 'Private' as 'Private' | 'Public',
  });
  const [isAddPagesOpen, setIsAddPagesOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('COCO');
  const [trainTestSplit, setTrainTestSplit] = useState(80);
  const [isExporting, setIsExporting] = useState(false);

  const [showProcessed, setShowProcessed] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);

  // Fetch document and pages on mount
  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  // Auto-open edit modal when navigating to /edit route
  useEffect(() => {
    if (isEditRoute && document && !isEditOpen) {
      openEditModal();
    }
  }, [isEditRoute, document]);

  const fetchDocument = async () => {
    if (!documentId) return;

    try {
      setIsLoading(true);
      const [doc, pagesData] = await Promise.all([
        documentService.getDocument(documentId),
        pageService.getPages(documentId),
      ]);
      setDocument(doc);
      setPages(pagesData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch document';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleConfirmDelete = async () => {
    if (!documentId) return;

    try {
      setIsDeleting(true);
      await documentService.deleteDocument(documentId);
      toast.success('Document deleted');
      navigate('/documents');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete document';
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  // Open edit modal
  const openEditModal = () => {
    if (!document) return;
    setEditForm({
      title: document.title,
      description: document.description || '',
      author: document.author || '',
      language: document.language || '',
      originCountry: document.originCountry || '',
      visibility: document.visibility,
    });
    setIsEditOpen(true);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!documentId) return;
    if (!editForm.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setIsSaving(true);
      const updated = await documentService.updateDocument(documentId, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        author: editForm.author.trim() || undefined,
        language: editForm.language.trim() || undefined,
        originCountry: editForm.originCountry.trim() || undefined,
        visibility: editForm.visibility,
      });
      setDocument(updated);
      setIsEditOpen(false);
      toast.success('Document updated');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update document';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    if (!documentId) return;

    try {
      setIsExporting(true);

      const request = {
        documentIds: [documentId],
        format: exportFormat,
        trainTestSplit: trainTestSplit / 100, // UI uses 0–100, backend expects 0–1
      };

      let blob: Blob;
      let extension: string;
      switch (exportFormat) {
        case 'COCO':
          blob = await exportService.exportCoco(request);
          extension = 'json';
          break;
        case 'YOLO':
          blob = await exportService.exportYolo(request);
          extension = 'zip';
          break;
        case 'TFRECORD':
          blob = await exportService.exportTfRecord(request);
          extension = 'zip';
          break;
        default:
          throw new Error(`Unsupported format: ${exportFormat}`);
      }

      const safeTitle = (document?.title ?? 'dataset').replace(/[^a-z0-9_-]+/gi, '_');
      exportService.downloadBlob(
        blob,
        `${safeTitle}-${exportFormat}-${Date.now()}.${extension}`
      );

      toast.success('Dataset exported successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!document) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/20 rounded-lg shadow-sm p-12 text-center">
          <p className="text-ink-900/60 font-serif italic text-lg mb-6">Document not found</p>
          <button
            onClick={() => navigate('/documents')}
            className="inline-flex items-center gap-2 px-5 py-3 bg-ink-900 hover:bg-primary-700 text-parchment-50 font-semibold rounded-md shadow-lg shadow-ink-900/20 transition-all hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/documents')}
          className="inline-flex items-center gap-2 text-sepia-700 hover:text-ink-900 font-semibold tracking-wider uppercase text-xs transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </button>

        <div className="bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/20 rounded-lg shadow-sm p-7">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink-900 leading-tight mb-3">
                {document.title}
              </h1>
              {document.description && (
                <p className="text-ink-900/70 leading-relaxed">{document.description}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setIsShareOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-ink-900 hover:bg-primary-700 text-parchment-50 rounded-md transition-colors font-semibold shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={openEditModal}
                className="flex items-center gap-2 px-4 py-2 bg-transparent border-2 border-ink-900/20 hover:border-ink-900/60 text-ink-900 rounded-md transition-colors font-semibold"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => setIsDeleteOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-transparent border-2 border-cipher-red/30 hover:border-cipher-red text-cipher-red hover:bg-cipher-red/5 rounded-md transition-colors font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-sepia-600/20 pt-6">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-sepia-700">
                Pages
              </p>
              <p className="font-serif text-2xl font-semibold text-ink-900 mt-1">
                {document.pageCount}
              </p>
            </div>
            {document.author && (
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-sepia-700">
                  Author
                </p>
                <p className="font-serif text-xl font-semibold text-ink-900 mt-1">
                  {document.author}
                </p>
              </div>
            )}
            {document.language && (
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-sepia-700">
                  Language
                </p>
                <p className="font-serif text-xl font-semibold text-ink-900 mt-1">
                  {document.language}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-sepia-700">
                Created
              </p>
              <p className="font-serif text-xl font-semibold text-ink-900 mt-1">
                {formatDate(document.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pages Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-3xl font-semibold text-ink-900">Pages</h2>

          <div className="flex gap-2 items-center">
            <button
              onClick={() => setIsAddPagesOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-ink-900 hover:bg-primary-700 text-parchment-50 rounded-md transition-colors font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Pages
            </button>

            <div className="flex gap-1 bg-parchment-100 border border-sepia-600/20 rounded-md p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-ink-900 text-parchment-50 shadow-sm'
                    : 'text-ink-900/60 hover:text-ink-900'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-ink-900 text-parchment-50 shadow-sm'
                    : 'text-ink-900/60 hover:text-ink-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-1 bg-parchment-100 border border-sepia-600/20 rounded-md p-1">
              <button
                onClick={() => setShowAnnotations((v) => !v)}
                title={showAnnotations ? 'Hide annotations' : 'Show annotations'}
                aria-label={showAnnotations ? 'Hide annotations' : 'Show annotations'}
                aria-pressed={showAnnotations}
                className={`p-2 rounded transition-colors ${
                  showAnnotations
                    ? 'bg-ink-900 text-parchment-50 shadow-sm'
                    : 'text-ink-900/60 hover:text-ink-900'
                }`}
              >
                <SquareDashed className="w-4 h-4" />
              </button>
            </div>

            {/* Original / Processed toggle */}
            {pages.some((p) => p.processedImageUrl) && (
              <div className="flex items-center gap-1 bg-parchment-100 border border-sepia-600/20 rounded-md p-1">
                <button
                  onClick={() => setShowProcessed(false)}
                  className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                    !showProcessed
                      ? 'bg-ink-900 text-parchment-50 shadow-sm'
                      : 'text-ink-900/60 hover:text-ink-900'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setShowProcessed(true)}
                  className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                    showProcessed
                      ? 'bg-ink-900 text-parchment-50 shadow-sm'
                      : 'text-ink-900/60 hover:text-ink-900'
                  }`}
                >
                  Processed
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pages Grid/List */}
        {pages.length === 0 ? (
          <div className="bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/20 rounded-lg shadow-sm p-12 text-center">
            <p className="text-ink-900/60 font-serif italic text-lg mb-6">No pages uploaded yet</p>
            <button
              onClick={() => setIsAddPagesOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-ink-900 hover:bg-primary-700 text-parchment-50 font-semibold rounded-md shadow-lg shadow-ink-900/20 transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              Add Pages
            </button>
          </div>
        ) : (
          <div
            className={`${
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-2'
            }`}
          >
            {pages.map((page) => (
              <div
                key={page.id}
                onClick={() =>
                  navigate(`/documents/${documentId}/annotate/${page.id}`)
                }
              >
                <PageThumbnail
                  page={page}
                  documentId={documentId!}
                  showProcessingStatus={true}
                  showProcessed={showProcessed}
                  showAnnotations={showAnnotations}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Section */}
      {pages.length > 0 && (
        <div className="bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/20 rounded-lg shadow-sm p-7">
          <h2 className="font-serif text-3xl font-semibold text-ink-900 mb-5 flex items-center gap-3">
            <Download className="w-6 h-6 text-sepia-700" />
            Export Dataset
          </h2>

          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['COCO', 'YOLO', 'TFRECORD'] as ExportFormat[]).map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors border ${
                      exportFormat === format
                        ? 'bg-ink-900 text-parchment-50 border-ink-900'
                        : 'bg-transparent text-ink-900 border-sepia-600/30 hover:border-ink-900/60'
                    }`}
                  >
                    {format === 'TFRECORD' ? 'TFRecord' : format}
                  </button>
                ))}
              </div>
            </div>

            {/* Train/Test Split */}
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
                Train/Test Split: <span className="font-mono normal-case tracking-normal text-ink-900">{trainTestSplit}% / {100 - trainTestSplit}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={trainTestSplit}
                onChange={(e) => setTrainTestSplit(Number(e.target.value))}
                className="w-full h-2 bg-parchment-200 rounded-lg appearance-none cursor-pointer accent-ink-900"
              />
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full px-4 py-3 bg-ink-900 hover:bg-primary-700 text-parchment-50 rounded-md transition-colors font-semibold shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-parchment-50 border-t-transparent rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export Dataset
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Add Pages Modal */}
      <AddPagesModal
        isOpen={isAddPagesOpen}
        onClose={() => setIsAddPagesOpen(false)}
        documentId={documentId!}
        onSuccess={(newPages) => {
          setPages((prev) => [...prev, ...newPages]);
        }}
      />

      {/* Share Document Modal */}
      <ShareDocumentModal
        documentId={documentId!}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />

      {/* Edit Document Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          if (isEditRoute) {
            navigate(`/documents/${documentId}`, { replace: true });
          }
        }}
        title="Edit Document"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-3 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
              placeholder="Document title"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
              Description
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="w-full px-3 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
              placeholder="Document description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
                Author
              </label>
              <input
                type="text"
                value={editForm.author}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, author: e.target.value }))
                }
                className="w-full px-3 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
                placeholder="Author name"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
                Language
              </label>
              <input
                type="text"
                value={editForm.language}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    language: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
                placeholder="Language"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
                Origin Country
              </label>
              <input
                type="text"
                value={editForm.originCountry}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    originCountry: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
                placeholder="Country of origin"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
                Visibility
              </label>
              <select
                value={editForm.visibility}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    visibility: e.target.value as 'Private' | 'Public',
                  }))
                }
                className="w-full px-3 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
              >
                <option value="Private">Private</option>
                <option value="Public">Public</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sepia-600/20">
            <button
              onClick={() => {
                setIsEditOpen(false);
                if (isEditRoute) {
                  navigate(`/documents/${documentId}`, { replace: true });
                }
              }}
              className="px-4 py-2 text-ink-900 bg-transparent border-2 border-ink-900/20 hover:border-ink-900/60 rounded-md transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="px-4 py-2 bg-ink-900 hover:bg-primary-700 text-parchment-50 rounded-md transition-colors font-semibold shadow-sm disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${document.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        isDangerous={true}
      />

    </div>
  );
};

export default DocumentDetailPage;
