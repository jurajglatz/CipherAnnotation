/**
 * Types and interfaces for CipherAnnotation frontend
 * Matches backend DTOs
 */

// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = 'User' | 'Admin';
export type PermissionType = 'Read' | 'Edit';
export type Visibility = 'Private' | 'Public';
/** Caller's effective permission on a document. */
export type MyPermission = 'Owner' | 'Edit' | 'Read' | 'None';

// ============================================================================
// USER
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUri?: string;
  role: UserRole;
  createdAt: string;
}

// ============================================================================
// AUTH
// ============================================================================

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// ============================================================================
// DOCUMENT
// ============================================================================

export interface Document {
  id: string;
  title: string;
  description?: string;
  originCountry?: string;
  author?: string;
  language?: string;
  visibility: Visibility;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  thumbnailUrl?: string;
  myPermission: MyPermission;
}

export interface CreateDocumentRequest {
  title: string;
  description?: string;
  originCountry?: string;
  author?: string;
  language?: string;
  visibility?: Visibility;
}

// ============================================================================
// PAGE
// ============================================================================

export interface Page {
  id: string;
  documentId: string;
  pageNumber: number;
  imageUrl: string;
  processedImageUrl?: string;
  width: number;
  height: number;
  orientation: number;
  resolutionDPI: number;
  createdAt: string;
  /** Backend undo/redo: current position in the persisted preprocess history. */
  currentPreprocessHistoryId?: string | null;
  canUndoPreprocess?: boolean;
  canRedoPreprocess?: boolean;
}

export interface PreprocessHistoryEntry {
  id: string;
  sequence: number;
  operations: { name: string; value?: number }[];
  appliedAt: string;
  isCurrent: boolean;
}

export interface PreprocessHistoryState {
  page: Page;
  entries: PreprocessHistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
}

export interface ApplyPreprocessToAllResult {
  pages: Page[];
  appliedCount: number;
  failedCount: number;
}

// ============================================================================
// ANNOTATIONS
// ============================================================================

export type AnnotationType = 'Text' | 'Cipher' | 'Symbol';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Caption {
  id: string;
  documentId: string;
  name: string;
  usageCount: number;
  createdAt: string;
}

export interface Annotation {
  id: string;
  pageId: string;
  parentId: string | null;
  captionId: string;
  captionName: string;
  captionNumber: number;
  type: AnnotationType;
  content?: string;
  transcription?: string;
  transcriptionRefId?: string | null;
  symbolId?: string | null;
  orientation: number;
  boundingBox: BoundingBox;
  createdAt: string;
}

/** Lightweight annotation row used by the document-wide Text picker. */
export interface DocumentAnnotationRef {
  id: string;
  pageId: string;
  pageNumber: number;
  content?: string;
  captionLabel: string;
  captionNumber: number;
}

// ============================================================================
// SYMBOLS
// ============================================================================

export type SymbolScope = 'mine' | 'shared' | 'public' | 'all';

export interface Symbol {
  id: string;
  ownerUserId: string;
  content?: string | null;
  imageUrl: string;
  referenceCount: number;
  createdAt: string;
}

export interface SymbolSuggestion {
  id: string;
  content?: string | null;
  imageUrl: string;
}

export interface UnlinkedSymbolAnnotation {
  annotationId: string;
  content?: string | null;
  documentId: string;
  documentTitle: string;
  pageId: string;
  pageNumber: number;
  boundingBox: BoundingBox;
  createdAt: string;
}

export interface SymbolOccurrence {
  annotationId: string;
  documentId: string;
  documentTitle: string;
  pageId: string;
  pageNumber: number;
  content?: string | null;
  boundingBox: BoundingBox;
}

export interface RecognizeSymbolResponse {
  content: string | null;
  confidence: number;
}

// ============================================================================
// SHARE
// ============================================================================

export interface DocumentShare {
  id: string;
  documentId: string;
  userId: string;
  userEmail: string;
  permission: PermissionType;
  sharedAt: string;
}

// ============================================================================
// EXPORT
// ============================================================================

export type ExportFormat = 'COCO' | 'YOLO' | 'TFRECORD';

export type CocoVariant = 'BBOX' | 'SEGMENTATION';
export type YoloVariant = 'DETECTION' | 'SEGMENTATION';
export type TfRecordVariant = 'DETECTION' | 'CLASSIFICATION';

export interface ExportRequest {
  documentIds: string[];
  format: ExportFormat;
  trainTestSplit: number;
  variant?: CocoVariant | YoloVariant | TfRecordVariant;
  captionIds?: string[];
}

// ============================================================================
// API RESPONSE WRAPPERS
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
