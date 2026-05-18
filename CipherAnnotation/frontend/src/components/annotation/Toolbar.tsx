/**
 * Toolbar Component
 * Top toolbar with tool selection, zoom controls, and page navigation
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  MousePointer2,
  Square,
  BoxSelect,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Image,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Wand2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, Modal } from '@/components/shared';
import AutoFillSymbolsButton from './AutoFillSymbolsButton';

export type ToolType = 'select' | 'annotation' | 'multiselect';

interface ToolbarProps {
  currentTool: ToolType;
  zoom: number;
  onToolChange: (tool: ToolType) => void;
  onZoomChange: (zoom: number) => void;
  showProcessed: boolean;
  onToggleImage: (show: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  pageNumber: number;
  pageCount: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  documentId: string;
  isPreprocessOpen: boolean;
  onTogglePreprocess: () => void;
  onAutoAnnotate: () => void;
  isAutoAnnotating: boolean;
  pageId: string;
  onSymbolsAutoFilled?: () => void;
  /** When true, hides/disables all mutating actions (used for read-only shares). */
  readOnly?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  zoom,
  onToolChange,
  onZoomChange,
  showProcessed,
  onToggleImage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  pageNumber,
  pageCount,
  onPrevPage,
  onNextPage,
  documentId,
  isPreprocessOpen,
  onTogglePreprocess,
  onAutoAnnotate,
  isAutoAnnotating,
  pageId,
  onSymbolsAutoFilled,
  readOnly = false,
}) => {
  const annotationToolDisabled = isPreprocessOpen || readOnly;
  const undoDisabled = !canUndo || readOnly;
  const redoDisabled = !canRedo || readOnly;
  const autoAnnotateDisabled = isPreprocessOpen || isAutoAnnotating || readOnly;
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="h-16 bg-parchment-50 border-b border-sepia-600/20 flex items-center justify-between px-4 gap-4">
      {/* Left section - Navigation and tools */}
      <div className="flex items-center gap-4">
        {/* Back button */}
        <Tooltip label="Back to document">
          <button
            onClick={() => navigate(`/documents/${documentId}`)}
            className="p-2 hover:bg-parchment-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-ink-900" />
          </button>
        </Tooltip>

        <div className="h-8 w-px bg-sepia-600/20" />

        {/* Tool selector */}
        <div
          className={`relative flex items-center gap-1 bg-parchment-100 p-1 rounded-md border border-sepia-600/20 ${
            isPreprocessOpen ? 'opacity-60' : ''
          }`}
        >
          <Tooltip label={isPreprocessOpen ? 'First close preprocessing' : 'Select & move annotations (V)'}>
            <button
              onClick={() => onToolChange('select')}
              disabled={isPreprocessOpen}
              className={`p-2 rounded transition-colors ${
                isPreprocessOpen
                  ? 'cursor-not-allowed'
                  : currentTool === 'select'
                    ? 'bg-parchment-50 shadow-sm ring-1 ring-sepia-600/20'
                    : 'hover:bg-parchment-200/60'
              }`}
            >
              <MousePointer2 className="w-5 h-5 text-ink-900" />
            </button>
          </Tooltip>

          <Tooltip
            label={
              isPreprocessOpen
                ? 'First close preprocessing'
                : 'Marquee select — draw a rectangle to select all annotations inside'
            }
          >
            <button
              onClick={() => onToolChange('multiselect')}
              disabled={isPreprocessOpen}
              className={`p-2 rounded transition-colors ${
                isPreprocessOpen
                  ? 'cursor-not-allowed opacity-50'
                  : currentTool === 'multiselect'
                    ? 'bg-parchment-50 shadow-sm ring-1 ring-sepia-600/20'
                    : 'hover:bg-parchment-200/60'
              }`}
            >
              <BoxSelect className="w-5 h-5 text-ink-900" />
            </button>
          </Tooltip>

          <Tooltip
            label={
              readOnly
                ? 'Read-only access'
                : isPreprocessOpen
                  ? 'First close preprocessing'
                  : 'Draw annotation'
            }
          >
            <button
              onClick={() => onToolChange('annotation')}
              disabled={annotationToolDisabled}
              className={`p-2 rounded transition-colors ${
                annotationToolDisabled
                  ? 'cursor-not-allowed opacity-50'
                  : currentTool === 'annotation'
                    ? 'bg-parchment-50 shadow-sm ring-1 ring-sepia-600/20'
                    : 'hover:bg-parchment-200/60'
              }`}
            >
              <Square className="w-5 h-5" style={{ color: '#4338ca' }} />
            </button>
          </Tooltip>

          {isPreprocessOpen && (
            <div className="absolute -top-1.5 -right-1.5 bg-sepia-700 text-parchment-50 rounded-full p-0.5 shadow-sm pointer-events-none">
              <Lock className="w-3 h-3" />
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-sepia-600/20" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Tooltip label={readOnly ? 'Read-only access' : 'Undo (Ctrl+Z)'}>
            <button
              onClick={onUndo}
              disabled={undoDisabled}
              className={`p-2 rounded transition-colors ${
                !undoDisabled
                  ? 'hover:bg-parchment-100 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-5 h-5 text-ink-900" />
            </button>
          </Tooltip>

          <Tooltip label={readOnly ? 'Read-only access' : 'Redo (Ctrl+Y)'}>
            <button
              onClick={onRedo}
              disabled={redoDisabled}
              className={`p-2 rounded transition-colors ${
                !redoDisabled
                  ? 'hover:bg-parchment-100 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-5 h-5 text-gray-700" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Center section - Page navigation and zoom */}
      <div className="flex items-center gap-4">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Tooltip label="Previous page">
            <button
              onClick={onPrevPage}
              disabled={pageNumber <= 1}
              className={`p-2 rounded transition-colors ${
                pageNumber > 1
                  ? 'hover:bg-gray-100'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
          </Tooltip>

          <span className="text-sm font-medium text-gray-700 min-w-fit">
            Page {pageNumber} / {pageCount}
          </span>

          <Tooltip label="Next page">
            <button
              onClick={onNextPage}
              disabled={pageNumber >= pageCount}
              className={`p-2 rounded transition-colors ${
                pageNumber < pageCount
                  ? 'hover:bg-gray-100'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </Tooltip>
        </div>

        <div className="h-8 w-px bg-sepia-600/20" />

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Tooltip label="Zoom out">
            <button
              onClick={() => onZoomChange(Math.max(20, zoom - 10))}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
            >
              <ZoomOut className="w-5 h-5 text-gray-700" />
            </button>
          </Tooltip>

          {/* Zoom slider */}
          <input
            type="range"
            min="20"
            max="300"
            step="10"
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            title="Zoom"
          />

          <Tooltip label="Zoom in">
            <button
              onClick={() => onZoomChange(Math.min(300, zoom + 10))}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
            >
              <ZoomIn className="w-5 h-5 text-gray-700" />
            </button>
          </Tooltip>

          <span className="text-sm font-medium text-gray-700 min-w-fit">
            {zoom}%
          </span>

          <Tooltip label="Reset zoom to 100%">
            <button
              onClick={() => onZoomChange(100)}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
            >
              <Maximize2 className="w-5 h-5 text-gray-700" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Right section - Image toggle + Help */}
      <div className="flex items-center gap-2">
        <Tooltip
          label={
            readOnly
              ? 'Read-only access'
              : isPreprocessOpen
                ? 'First close preprocessing'
                : isAutoAnnotating
                  ? 'Detecting…'
                  : 'Auto-annotate this page (YOLOv11)'
          }
          position="left"
        >
          <button
            onClick={onAutoAnnotate}
            disabled={autoAnnotateDisabled}
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
              autoAnnotateDisabled
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <Sparkles className={`w-5 h-5 ${isAutoAnnotating ? 'animate-pulse' : ''}`} style={{ color: '#7c3aed' }} />
            <span className="text-xs font-medium">
              {isAutoAnnotating ? 'Detecting…' : 'Auto-annotate'}
            </span>
          </button>
        </Tooltip>

        {!readOnly && (
          <AutoFillSymbolsButton
            pageId={pageId}
            documentId={documentId}
            disabled={isPreprocessOpen}
            onCompleted={onSymbolsAutoFilled}
          />
        )}

        {!readOnly && (
          <Tooltip label={isPreprocessOpen ? 'Close preprocessing' : 'Open preprocessing'} position="left">
            <button
              onClick={onTogglePreprocess}
              className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                isPreprocessOpen
                  ? 'bg-sepia-700 text-parchment-50'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Wand2 className="w-5 h-5" />
              <span className="text-xs font-medium">Preprocess</span>
            </button>
          </Tooltip>
        )}

        <Tooltip
          label={
            showProcessed
              ? 'Switch to original image'
              : 'Switch to processed image'
          }
          position="left"
        >
          <button
            onClick={() => onToggleImage(!showProcessed)}
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
              showProcessed
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <Image className="w-5 h-5" />
            <span className="text-xs font-medium">
              {showProcessed ? 'Processed' : 'Original'}
            </span>
          </button>
        </Tooltip>

        <Tooltip label="How to use this screen" position="left">
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-gray-700" />
          </button>
        </Tooltip>
      </div>

      <Modal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Annotation — quick guide"
        size="xl"
      >
        <div className="space-y-5 text-sm text-gray-700">
          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Drawing</h3>
            <p>
              Draw an annotation by holding the Annotation tool and dragging on the page.
              Annotations fully inside another become its children automatically. Use the
              Captions panel to rename the labels (Section, Pair, Element are just defaults).
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Selecting & editing</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Switch to the <span className="font-medium">Select</span> tool (arrow icon).</li>
              <li>Click a box to select it. Use the resize handles to change its size.</li>
              <li>Click inside a selected box, then click again at the new position to move it.</li>
              <li>Moving a pair/element to a different parent reassigns it automatically.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Multi-selection</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">⌘</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl</kbd> + click adds or removes a box from the selection (works on canvas and in the tree).</li>
              <li>Drag any selected box to move the whole group by the same delta.</li>
              <li><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Delete</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Backspace</kbd> removes everything selected in one undoable step.</li>
              <li><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">⌘</kbd>/<kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">D</kbd> duplicates the selection.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Locking</h3>
            <p>
              Click the lock icon next to a row in the left panel to prevent moving or resizing. Locking a parent
              locks all its descendants.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Keyboard shortcuts</h3>
            <div className="grid grid-cols-2 gap-y-1 gap-x-4">
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">⌘/Ctrl + Z</kbd></span><span>Undo</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">⌘/Ctrl + Shift + Z</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">⌘/Ctrl + Y</kbd></span><span>Redo</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">⌘/Ctrl + D</kbd></span><span>Duplicate selection</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Delete</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Backspace</kbd></span><span>Delete selection</span>
            </div>
          </section>
        </div>
      </Modal>
    </div>
  );
};

export default Toolbar;
