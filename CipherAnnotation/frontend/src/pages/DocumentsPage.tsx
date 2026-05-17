/**
 * DocumentsPage Component
 * User's documents list page with grid layout, search, and filtering
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Lock, Globe, Trash2, Share2, Eye, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocuments } from '@/hooks/useDocuments';
import { useTour } from '@/hooks/useTour';
import { Document, Visibility } from '@/types';
import { documentService } from '@/services';
import { LoadingSpinner, Modal, ConfirmDialog, Pagination } from '@/components/shared';
import DocumentCard from '@/components/documents/DocumentCard';
import CreateDocumentModal from '@/components/documents/CreateDocumentModal';
import ShareDocumentModal from '@/components/documents/ShareDocumentModal';

type VisibilityFilter = 'All' | 'Private' | 'Public';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { documents, loading, error, fetchDocuments, deleteDocument } = useDocuments();
  useTour('documents');

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [navigateAfterSave, setNavigateAfterSave] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    author: '',
    language: '',
    originCountry: '',
    visibility: 'Private' as 'Private' | 'Public',
  });

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments('my');
  }, [fetchDocuments]);

  // Handle document deletion
  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    try {
      setIsDeleting(true);
      await deleteDocument(documentToDelete.id);
      toast.success('Document deleted successfully');
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete document';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle share
  const handleShare = (doc: Document) => {
    setSelectedDocument(doc);
    setIsShareModalOpen(true);
  };

  // Handle document view
  const handleViewDocument = (doc: Document) => {
    navigate(`/documents/${doc.id}`);
  };

  // Handle document edit
  const handleEditDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setEditForm({
      title: doc.title,
      description: doc.description || '',
      author: doc.author || '',
      language: doc.language || '',
      originCountry: doc.originCountry || '',
      visibility: doc.visibility,
    });
    setNavigateAfterSave(false);
    setIsEditModalOpen(true);
  };

  // Handle document duplicate: clone on backend, then open edit modal prefilled
  // with the new doc so the user can rename/adjust metadata before annotating.
  const handleDuplicateDocument = async (doc: Document) => {
    try {
      const newDoc = await documentService.duplicateDocument(doc.id);
      toast.success('Document duplicated');
      setSelectedDocument(newDoc);
      setEditForm({
        title: newDoc.title,
        description: newDoc.description || '',
        author: newDoc.author || '',
        language: newDoc.language || '',
        originCountry: newDoc.originCountry || '',
        visibility: newDoc.visibility,
      });
      setNavigateAfterSave(true);
      setIsEditModalOpen(true);
      fetchDocuments('my');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate document';
      toast.error(message);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedDocument) return;
    if (!editForm.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setIsSaving(true);
      await documentService.updateDocument(selectedDocument.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        author: editForm.author.trim() || undefined,
        language: editForm.language.trim() || undefined,
        originCountry: editForm.originCountry.trim() || undefined,
        visibility: editForm.visibility,
      });
      toast.success('Document updated');
      setIsEditModalOpen(false);
      const goToId = navigateAfterSave ? selectedDocument.id : null;
      setSelectedDocument(null);
      setNavigateAfterSave(false);
      fetchDocuments('my');
      if (goToId) {
        navigate(`/documents/${goToId}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update document';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter and search documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    const matchesVisibility =
      visibilityFilter === 'All' || doc.visibility === visibilityFilter;

    return matchesSearch && matchesVisibility;
  });

  // Reset to first page whenever the result set changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, visibilityFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDocuments = filteredDocuments.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink-900 leading-tight">
              My <em className="italic font-normal text-sepia-700">Documents</em>
            </h1>
            <p className="text-ink-900/70 mt-2">
              Manage and annotate your documents
            </p>
          </div>
          <button
            data-tour="new-document"
            onClick={() => setIsCreateModalOpen(true)}
            className="group inline-flex items-center gap-2 px-5 py-3 bg-ink-900 hover:bg-primary-700 text-parchment-50 font-semibold rounded-md shadow-lg shadow-ink-900/20 transition-all hover:shadow-xl hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            New Document
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div data-tour="documents-search" className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sepia-600" />
            <input
              type="text"
              placeholder="Search documents by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-parchment-50/80 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/60 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
            />
          </div>

          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
            className="px-4 py-2.5 bg-parchment-50/80 border border-sepia-600/30 text-ink-900 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
          >
            <option value="All">All Documents</option>
            <option value="Private">Private</option>
            <option value="Public">Public</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && documents.length === 0 && <LoadingSpinner />}

      {/* Empty State */}
      {!loading && filteredDocuments.length === 0 && (
        <div className="bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/20 rounded-lg shadow-sm p-12 text-center">
          {documents.length === 0 ? (
            <>
              <p className="text-ink-900/60 mb-6 font-serif italic text-lg">No documents yet</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-ink-900 hover:bg-primary-700 text-parchment-50 font-semibold rounded-md shadow-lg shadow-ink-900/20 transition-all hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                Create your first document
              </button>
            </>
          ) : (
            <p className="text-ink-900/60 font-serif italic">
              No documents match your search criteria
            </p>
          )}
        </div>
      )}

      {/* Documents Grid */}
      {!loading && filteredDocuments.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedDocuments.map((doc, index) => (
              <div key={doc.id} data-tour={index === 0 ? 'document-card' : undefined}>
                <DocumentCard
                  document={doc}
                  onView={handleViewDocument}
                  onEdit={handleEditDocument}
                  onDelete={handleDeleteClick}
                  onShare={handleShare}
                  onDuplicate={handleDuplicateDocument}
                />
              </div>
            ))}
          </div>
          <Pagination
            currentPage={safePage}
            totalItems={filteredDocuments.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="documents"
          />
        </>
      )}

      {/* Create Document Modal */}
      <CreateDocumentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchDocuments('my');
        }}
      />

      {/* Share Document Modal */}
      {selectedDocument && (
        <ShareDocumentModal
          documentId={selectedDocument.id}
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSelectedDocument(null);
          }}
        />
      )}

      {/* Edit Document Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedDocument(null);
        }}
        title="Edit Document"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">Title *</label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
              placeholder="Document title"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
              placeholder="Document description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">Author</label>
              <input
                type="text"
                value={editForm.author}
                onChange={(e) => setEditForm((prev) => ({ ...prev, author: e.target.value }))}
                className="w-full px-3 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
                placeholder="Author name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">Language</label>
              <input
                type="text"
                value={editForm.language}
                onChange={(e) => setEditForm((prev) => ({ ...prev, language: e.target.value }))}
                className="w-full px-3 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
                placeholder="Language"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">Origin Country</label>
              <input
                type="text"
                value={editForm.originCountry}
                onChange={(e) => setEditForm((prev) => ({ ...prev, originCountry: e.target.value }))}
                className="w-full px-3 py-2.5 bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/50 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
                placeholder="Country of origin"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">Visibility</label>
              <select
                value={editForm.visibility}
                onChange={(e) => setEditForm((prev) => ({ ...prev, visibility: e.target.value as 'Private' | 'Public' }))}
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
                setIsEditModalOpen(false);
                setSelectedDocument(null);
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${documentToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        isDangerous={true}
      />
    </div>
  );
};

export default DocumentsPage;
