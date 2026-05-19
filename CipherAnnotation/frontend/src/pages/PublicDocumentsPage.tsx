/**
 * PublicDocumentsPage Component
 * Public documents library page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocuments } from '@/hooks/useDocuments';
import { useTour } from '@/hooks/useTour';
import { LoadingSpinner } from '@/components/shared';
import DocumentCard from '@/components/documents/DocumentCard';
import { Document } from '@/types';

export const PublicDocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { documents, loading, error, fetchDocuments } = useDocuments();
  useTour('public-documents');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDocuments('public');
  }, [fetchDocuments]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleViewDocument = (doc: Document) => {
    navigate(`/documents/${doc.id}`);
  };

  const filteredDocuments = documents.filter((doc) => {
    return (
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink-900 leading-tight">
          Public <em className="italic font-normal text-sepia-700">Library</em>
        </h1>
        <p className="text-ink-900/70 mt-2">Browse documents shared by the community</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div data-tour="public-search" className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sepia-600" />
          <input
            type="text"
            placeholder="Search public documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-parchment-50/80 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/60 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && documents.length === 0 && <LoadingSpinner />}

      {/* Empty State */}
      {!loading && filteredDocuments.length === 0 && (
        <div className="bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/20 rounded-lg shadow-sm p-12 text-center">
          <Globe className="w-14 h-14 text-sepia-600/40 mx-auto mb-4" />
          <p className="text-ink-900/60 font-serif italic text-lg">
            {documents.length === 0
              ? 'No public documents available yet.'
              : 'No documents match your search criteria.'}
          </p>
        </div>
      )}

      {/* Documents Grid */}
      {!loading && filteredDocuments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc, index) => (
            <div key={doc.id} data-tour={index === 0 ? 'public-document-card' : undefined}>
              <DocumentCard
                document={doc}
                onView={handleViewDocument}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicDocumentsPage;
