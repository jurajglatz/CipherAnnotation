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
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Caption, CocoVariant, Document, ExportFormat, Page, TfRecordVariant, YoloVariant } from '@/types';
import { captionService, documentService, exportService, pageService } from '@/services';
import { LoadingSpinner, Modal, ConfirmDialog, Pagination } from '@/components/shared';
import PageThumbnail from '@/components/documents/PageThumbnail';
import { ShareDocumentModal } from '@/components/documents/ShareDocumentModal';
import { AddPagesModal } from '@/components/documents/AddPagesModal';
import { useTour } from '@/hooks/useTour';

type ViewMode = 'grid' | 'list';

export const DocumentDetailPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditRoute = location.pathname.endsWith('/edit');
  useTour('document-detail');

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
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [isDeletingPage, setIsDeletingPage] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('COCO');
  const [cocoVariant, setCocoVariant] = useState<CocoVariant>('BBOX');
  const [yoloVariant, setYoloVariant] = useState<YoloVariant>('DETECTION');
  const [tfVariant, setTfVariant] = useState<TfRecordVariant>('DETECTION');
  const [trainTestSplit, setTrainTestSplit] = useState(80);
  const [includeImages, setIncludeImages] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selectedCaptionIds, setSelectedCaptionIds] = useState<Set<string>>(new Set());
  const [isLoadingCaptions, setIsLoadingCaptions] = useState(false);
  const [exportFilename, setExportFilename] = useState('');
  const [filenameTouched, setFilenameTouched] = useState(false);
  const [showVariantHelp, setShowVariantHelp] = useState(false);

  const sanitizeFilename = (s: string) => s.replace(/[^a-z0-9_-]+/gi, '_');
  const buildDefaultFilename = (title: string | undefined, format: ExportFormat) => {
    const safe = sanitizeFilename(title ?? 'dataset');
    return `${safe}_${format.toLowerCase()}_export`;
  };

  const formatVariantOptions: Record<ExportFormat, { value: string; label: string }[]> = {
    COCO: [
      { value: 'BBOX', label: 'Bounding Box' },
      { value: 'SEGMENTATION', label: 'Segmentation' },
    ],
    YOLO: [
      { value: 'DETECTION', label: 'Detection' },
      { value: 'SEGMENTATION', label: 'Segmentation' },
    ],
    TFRECORD: [
      { value: 'DETECTION', label: 'Detection' },
      { value: 'CLASSIFICATION', label: 'Classification' },
    ],
  };

  const currentVariant =
    exportFormat === 'COCO' ? cocoVariant : exportFormat === 'YOLO' ? yoloVariant : tfVariant;
  const setCurrentVariant = (v: string) => {
    if (exportFormat === 'COCO') setCocoVariant(v as CocoVariant);
    else if (exportFormat === 'YOLO') setYoloVariant(v as YoloVariant);
    else setTfVariant(v as TfRecordVariant);
  };

  const [showProcessed, setShowProcessed] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [currentPagePage, setCurrentPagePage] = useState(1);
  const [pagesPageSize, setPagesPageSize] = useState(12);

  useEffect(() => {
    setCurrentPagePage(1);
  }, [pagesPageSize, pages.length]);

  const totalPagesPages = Math.max(1, Math.ceil(pages.length / pagesPageSize));
  const safePagesPage = Math.min(currentPagePage, totalPagesPages);
  const paginatedPages = pages.slice(
    (safePagesPage - 1) * pagesPageSize,
    safePagesPage * pagesPageSize
  );

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

  // Initialize filename when export modal opens
  useEffect(() => {
    if (isExportOpen) {
      setExportFilename(buildDefaultFilename(document?.title, exportFormat));
      setFilenameTouched(false);
    }
  }, [isExportOpen]);

  // Update default filename when format changes (unless user edited it)
  useEffect(() => {
    if (isExportOpen && !filenameTouched) {
      setExportFilename(buildDefaultFilename(document?.title, exportFormat));
    }
  }, [exportFormat]);

  // Fetch captions when export modal opens
  useEffect(() => {
    if (!isExportOpen || !documentId) return;
    let cancelled = false;
    (async () => {
      try {
        setIsLoadingCaptions(true);
        const data = await captionService.list(documentId);
        if (cancelled) return;
        setCaptions(data);
        setSelectedCaptionIds(new Set(data.map((c) => c.id)));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load captions';
        toast.error(message);
      } finally {
        if (!cancelled) setIsLoadingCaptions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isExportOpen, documentId]);

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

  // Handle page delete
  const handleConfirmDeletePage = async () => {
    if (!documentId || !pageToDelete) return;
    try {
      setIsDeletingPage(true);
      await pageService.deletePage(documentId, pageToDelete.id);
      setPages((prev) => prev.filter((p) => p.id !== pageToDelete.id));
      setDocument((prev) =>
        prev ? { ...prev, pageCount: Math.max(0, prev.pageCount - 1) } : prev
      );
      toast.success('Page deleted');
      setPageToDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete page';
      toast.error(message);
    } finally {
      setIsDeletingPage(false);
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

      if (captions.length > 0 && selectedCaptionIds.size === 0) {
        toast.error('Select at least one caption to export');
        setIsExporting(false);
        return;
      }

      const request = {
        documentIds: [documentId],
        format: exportFormat,
        trainTestSplit: trainTestSplit / 100, // UI uses 0–100, backend expects 0–1
        variant: currentVariant,
        captionIds: Array.from(selectedCaptionIds),
        includeImages,
      };

      let blob: Blob;
      let extension: string;
      switch (exportFormat) {
        case 'COCO':
          blob = await exportService.exportCoco(request);
          extension = includeImages ? 'zip' : 'json';
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

      const baseName =
        sanitizeFilename(exportFilename.trim()) ||
        buildDefaultFilename(document?.title, exportFormat);
      exportService.downloadBlob(blob, `${baseName}.${extension}`);

      toast.success('Dataset exported successfully');
      setIsExportOpen(false);
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
              {document.myPermission === 'Owner' && (
                <button
                  data-tour="share-button"
                  onClick={() => setIsShareOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-ink-900 hover:bg-primary-700 text-parchment-50 rounded-md transition-colors font-semibold shadow-sm"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              )}
              {pages.length > 0 && (
                <button
                  data-tour="export-button"
                  onClick={() => setIsExportOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-transparent border-2 border-ink-900/20 hover:border-ink-900/60 text-ink-900 rounded-md transition-colors font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              )}
              {document.myPermission === 'Owner' && (
                <>
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
                </>
              )}
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
            {document.myPermission === 'Owner' && (
              <button
                data-tour="add-pages"
                onClick={() => setIsAddPagesOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-ink-900 hover:bg-primary-700 text-parchment-50 rounded-md transition-colors font-semibold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Pages
              </button>
            )}

            <div data-tour="view-mode-toggle" className="flex gap-1 bg-parchment-100 border border-sepia-600/20 rounded-md p-1">
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
            {document.myPermission === 'Owner' && (
              <button
                onClick={() => setIsAddPagesOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-ink-900 hover:bg-primary-700 text-parchment-50 font-semibold rounded-md shadow-lg shadow-ink-900/20 transition-all hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                Add Pages
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className={`${
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-2'
              }`}
            >
              {paginatedPages.map((page, index) => (
                <div
                  key={page.id}
                  data-tour={index === 0 ? 'page-thumb' : undefined}
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
                    onDelete={
                      document.myPermission === 'Owner'
                        ? () => setPageToDelete(page)
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
            <Pagination
              currentPage={safePagesPage}
              totalItems={pages.length}
              pageSize={pagesPageSize}
              onPageChange={setCurrentPagePage}
              onPageSizeChange={setPagesPageSize}
              itemLabel="pages"
            />
          </>
        )}
      </div>

      {/* Export Dataset Modal */}
      <Modal
        isOpen={isExportOpen}
        onClose={() => !isExporting && setIsExportOpen(false)}
        title="Export Dataset"
        size="md"
      >
        <div className="space-y-6">
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

          <div>
            <div className="flex items-center gap-2 mb-2 relative">
              <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700">
                {exportFormat === 'TFRECORD' ? 'TFRecord' : exportFormat} Variant
              </label>
              <button
                type="button"
                onClick={() => setShowVariantHelp((v) => !v)}
                onBlur={() => setShowVariantHelp(false)}
                aria-label="What do these variants mean?"
                className="text-ink-900/50 hover:text-ink-900 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              {showVariantHelp && (
                <div
                  className="absolute left-0 top-6 z-20 w-80 p-3 bg-parchment-50 border border-sepia-600/40 rounded-md shadow-lg shadow-ink-900/20 text-xs text-ink-900 leading-relaxed"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <p className="font-semibold mb-1">Bounding Box / Detection</p>
                  <p className="mb-2 text-ink-900/80">
                    Stores each annotation as a rectangle (x, y, width, height). Smaller, faster, used for object detection models.
                  </p>
                  <p className="font-semibold mb-1">Segmentation</p>
                  <p className="mb-2 text-ink-900/80">
                    Stores the exact polygon outline of each annotation. Larger, more precise, used for instance-segmentation models. Requires polygon annotations.
                  </p>
                  <p className="font-semibold mb-1">Classification (TFRecord)</p>
                  <p className="text-ink-900/80">
                    Drops location data and stores only the class label per image — for image classification models.
                  </p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {formatVariantOptions[exportFormat].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCurrentVariant(opt.value)}
                  className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors border ${
                    currentVariant === opt.value
                      ? 'bg-ink-900 text-parchment-50 border-ink-900'
                      : 'bg-transparent text-ink-900 border-sepia-600/30 hover:border-ink-900/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700">
                Captions to Include
              </label>
              {captions.length > 0 && (
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedCaptionIds(new Set(captions.map((c) => c.id)))}
                    className="text-ink-900/70 hover:text-ink-900 font-semibold uppercase tracking-wider"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCaptionIds(new Set())}
                    className="text-ink-900/70 hover:text-ink-900 font-semibold uppercase tracking-wider"
                  >
                    None
                  </button>
                </div>
              )}
            </div>
            {isLoadingCaptions ? (
              <p className="text-sm text-ink-900/60 italic">Loading captions...</p>
            ) : captions.length === 0 ? (
              <p className="text-sm text-ink-900/60 italic">No captions found for this document.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-sepia-600/30 rounded-md divide-y divide-sepia-600/20">
                {captions.map((c) => {
                  const checked = selectedCaptionIds.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-parchment-100 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedCaptionIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            return next;
                          });
                        }}
                        className="w-4 h-4 accent-ink-900"
                      />
                      <span className="flex-1 text-sm text-ink-900 font-medium">{c.name}</span>
                      <span className="text-xs text-ink-900/50 font-mono">{c.usageCount}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

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

          <div>
            <label
              className={`flex items-center gap-3 ${
                exportFormat === 'COCO' ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
            >
              <input
                type="checkbox"
                checked={exportFormat === 'COCO' ? includeImages : true}
                disabled={exportFormat !== 'COCO'}
                onChange={(e) => setIncludeImages(e.target.checked)}
                className="w-4 h-4 accent-ink-900 disabled:opacity-60"
              />
              <span className="flex-1">
                <span className="block text-sm text-ink-900 font-medium">Include image files</span>
                <span className="block text-xs text-ink-900/50">
                  {exportFormat === 'COCO'
                    ? 'Bundle the page images alongside the annotations (exports a ZIP instead of a plain JSON).'
                    : 'Images are always included for this format.'}
                </span>
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
              File Name
            </label>
            <div className="flex items-stretch">
              <input
                type="text"
                value={exportFilename}
                onChange={(e) => {
                  setExportFilename(e.target.value);
                  setFilenameTouched(true);
                }}
                placeholder={buildDefaultFilename(document?.title, exportFormat)}
                className="flex-1 px-3 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-l-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors font-mono text-sm"
              />
              <span className="inline-flex items-center px-3 bg-parchment-200 border border-l-0 border-sepia-600/30 rounded-r-md text-ink-900/60 font-mono text-sm">
                .{exportFormat === 'COCO' && !includeImages ? 'json' : 'zip'}
              </span>
            </div>
            <p className="text-xs text-ink-900/50 mt-1">
              Allowed: letters, numbers, _ and -. Other characters will be replaced.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sepia-600/20">
            <button
              onClick={() => setIsExportOpen(false)}
              disabled={isExporting}
              className="px-4 py-2 text-ink-900 bg-transparent border-2 border-ink-900/20 hover:border-ink-900/60 rounded-md transition-colors font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={
                isExporting ||
                isLoadingCaptions ||
                (captions.length > 0 && selectedCaptionIds.size === 0)
              }
              className="px-4 py-2 bg-ink-900 hover:bg-primary-700 text-parchment-50 rounded-md transition-colors font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2"
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
      </Modal>

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

      {/* Delete Page Confirmation */}
      <ConfirmDialog
        isOpen={pageToDelete !== null}
        onClose={() => !isDeletingPage && setPageToDelete(null)}
        onConfirm={handleConfirmDeletePage}
        title="Delete Page"
        message={
          pageToDelete
            ? `Delete page ${pageToDelete.pageNumber}? Its annotations and preprocessing history will be removed. This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeletingPage}
        isDangerous={true}
      />

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
