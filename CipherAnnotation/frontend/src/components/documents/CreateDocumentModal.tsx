/**
 * CreateDocumentModal Component
 * Modal form to create a new document with file uploads
 */

import React, { useState, useRef } from 'react';
import { X, Upload, Plus, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocuments } from '@/hooks/useDocuments';
import { Modal } from '@/components/shared';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SelectedFile {
  id: string;
  file: File;
  preview: string;
}

export const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createDocument } = useDocuments();
  const dragCounter = useRef(0);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [author, setAuthor] = useState('');
  const [language, setLanguage] = useState('');
  const [visibility, setVisibility] = useState<'Private' | 'Public'>('Private');
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      addFiles(newFiles);
    }
  };

  // Add files with preview
  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      const validTypes = ['image/png', 'image/jpeg', 'image/tiff'];
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid image format (PNG, JPG, TIFF)`);
        return false;
      }
      return true;
    });

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFiles((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    }
  };

  // Remove file
  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Reorder files
  const moveFile = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= files.length) return;

    const newFiles = [...files];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setFiles(newFiles);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      toast.error('Document title is required');
      return;
    }

    if (files.length === 0) {
      toast.error('Please upload at least one page image');
      return;
    }

    try {
      setIsLoading(true);

      // Build FormData
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('originCountry', originCountry);
      formData.append('author', author);
      formData.append('language', language);
      formData.append('visibility', visibility);

      // Append files
      files.forEach((f, index) => {
        formData.append(`files`, f.file, f.file.name);
      });

      await createDocument(formData);
      toast.success('Document created successfully');

      // Reset form
      setTitle('');
      setDescription('');
      setOriginCountry('');
      setAuthor('');
      setLanguage('');
      setVisibility('Private');
      setFiles([]);

      onSuccess();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create document';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Document" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Document Information
          </h3>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Document title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Document description..."
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Origin Country
              </label>
              <input
                type="text"
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., USA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Author name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., English"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'Private' | 'Public')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Private">Private</option>
                <option value="Public">Public</option>
              </select>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Upload Pages *</h3>

          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.tiff,.tif"
              onChange={handleFileChange}
              className="hidden"
            />

            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              Drag and drop your page images here
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Supported formats: PNG, JPG, TIFF
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Browse Files
            </button>
          </div>

          {/* File Thumbnails */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Selected files ({files.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={file.id}
                    className="relative group bg-gray-100 rounded-lg overflow-hidden border border-gray-300 hover:border-gray-400"
                  >
                    <img
                      src={file.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-colors flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveFile(index, index - 1)}
                        className="hidden group-hover:flex items-center justify-center w-6 h-6 bg-gray-700 hover:bg-gray-800 text-white rounded transition-colors"
                        title="Move up"
                      >
                        <span className="text-xs">↑</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="hidden group-hover:flex items-center justify-center w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFile(index, index + 1)}
                        className="hidden group-hover:flex items-center justify-center w-6 h-6 bg-gray-700 hover:bg-gray-800 text-white rounded transition-colors"
                        title="Move down"
                      >
                        <span className="text-xs">↓</span>
                      </button>
                    </div>
                    <div className="absolute bottom-0 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded-tl">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Document
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateDocumentModal;
