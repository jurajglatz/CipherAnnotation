/**
 * Types and interfaces for CipherAnnotation frontend
 * Matches backend DTOs
 */

// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = 'User' | 'Admin';
export type ElementType = 'Plaintext' | 'Ciphertext';
export type PermissionType = 'Read' | 'Edit';
export type Visibility = 'Private' | 'Public';

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
  token: string;
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

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SectionAnnotation {
  id: string;
  pageId: string;
  label?: string;
  orientation: number;
  boundingBox: BoundingBox;
  createdAt: string;
  pairAnnotations?: PairAnnotation[];
}

export interface PairAnnotation {
  id: string;
  sectionId: string;
  order: number;
  orientation: number;
  boundingBox: BoundingBox;
  createdAt: string;
  elementAnnotations?: ElementAnnotation[];
}

export interface ElementAnnotation {
  id: string;
  pairId: string;
  symbolId?: string;
  type: ElementType;
  content?: string;
  transcription?: string;
  orientation: number;
  boundingBox: BoundingBox;
  symbolCode?: string;
  createdAt: string;
}

// ============================================================================
// SYMBOL
// ============================================================================

export interface Symbol {
  id: string;
  code: string;
  previewImageUrl?: string;
  createdAt: string;
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

export interface ExportRequest {
  documentIds: string[];
  format: ExportFormat;
  trainTestSplit: number;
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
