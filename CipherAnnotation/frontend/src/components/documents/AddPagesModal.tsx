import React, { useEffect, useRef, useState } from 'react';
import { X, Upload, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { pageService } from '@/services';
import { Modal } from '@/components/shared';
import { Page } from '@/types';

interface AddPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  onSuccess: (newPages: Page[]) => void;
}

interface SelectedFile {
  id: string;
  file: File;
  preview: string;
}

export const AddPagesModal: React.FC<AddPagesModalProps> = ({
  isOpen,
  onClose,
  documentId,
  onSuccess,
}) => {
  const dragCounter = useRef(0);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      const validTypes = ['image/png', 'image/jpeg', 'image/tiff'];
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid image format (PNG, JPG, TIFF)`);
        return false;
      }
      return true;
    });

    // Synchronous object URLs — the `files` state updates in the same tick, so
    // the Upload button enables immediately and there is no race for callers
    // (UI or E2E) that flip the trigger right after the change event fires.
    if (validFiles.length === 0) return;
    const next: SelectedFile[] = validFiles.map((file) => {
      const preview = URL.createObjectURL(file);
      objectUrlsRef.current.push(preview);
      return {
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview,
      };
    });
    setFiles((prev) => [...prev, ...next]);
  };

  // Track every object URL we hand out so we can revoke them on unmount —
  // a state closure inside useEffect would only see the initial files array.
  const objectUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(Array.from(event.target.files));
    }
  };

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
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= files.length) return;
    const newFiles = [...files];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setFiles(newFiles);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one page image');
      return;
    }

    try {
      setIsLoading(true);
      const newPages = await pageService.addPages(
        documentId,
        files.map((f) => f.file)
      );
      toast.success(`${newPages.length} page(s) added successfully`);
      setFiles([]);
      onSuccess(newPages);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add pages';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFiles([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Pages" size="lg">
      <div className="space-y-6">
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
                      <span className="text-xs">&uarr;</span>
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
                      <span className="text-xs">&darr;</span>
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || files.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {files.length > 0 ? `${files.length} Page(s)` : 'Pages'}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddPagesModal;
