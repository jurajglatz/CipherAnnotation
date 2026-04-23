# CipherAnnotation Frontend Architecture

This document describes the TypeScript/React frontend architecture for CipherAnnotation.

## Directory Structure

```
src/
├── types/
│   └── index.ts                 # All TypeScript interfaces and types
├── services/
│   ├── api.ts                   # Axios instance with JWT interceptors
│   ├── authService.ts           # Authentication API calls
│   ├── documentService.ts       # Document CRUD operations
│   ├── pageService.ts           # Page retrieval and preprocessing
│   ├── annotationService.ts     # Annotation (section/pair/element) operations
│   ├── symbolService.ts         # Symbol management
│   ├── exportService.ts         # Dataset export (COCO/YOLO)
│   └── index.ts                 # Services barrel export
├── context/
│   ├── AuthContext.tsx          # Authentication state context
│   └── index.ts                 # Context barrel export
├── hooks/
│   ├── useAuth.ts               # Access auth context
│   ├── useDocuments.ts          # Document operations hook
│   ├── usePages.ts              # Page operations hook
│   ├── useAnnotations.ts        # Annotation operations hook
│   └── index.ts                 # Hooks barrel export
└── ARCHITECTURE.md              # This file
```

## Types (`types/index.ts`)

Complete TypeScript interfaces matching backend DTOs:

### Core Types
- **UserRole**: 'User' | 'Admin'
- **ElementType**: 'Plaintext' | 'Ciphertext'
- **PermissionType**: 'Read' | 'Edit'
- **Visibility**: 'Private' | 'Public'

### Models
- **User**: User profile with id, email, name, role
- **Document**: Document metadata and ownership
- **Page**: Document page with image URLs
- **SectionAnnotation**: Section-level annotation
- **PairAnnotation**: Pair within section
- **ElementAnnotation**: Element within pair
- **Symbol**: Symbol representation
- **DocumentShare**: Share permissions

### API Requests/Responses
- **AuthResponse**: { token, user }
- **LoginRequest**: { email, password }
- **RegisterRequest**: { email, password, name }
- **CreateDocumentRequest**: Document creation payload
- **ExportRequest**: Export configuration

## Services

### api.ts
**Axios instance with JWT interceptors**
- Automatically attaches Bearer token from localStorage
- Handles 401 Unauthorized by clearing storage and redirecting to /login
- Base URL: `/api`

```typescript
import { api } from '@/services';

const response = await api.get('/documents');
```

### authService.ts
**Authentication API operations**

Methods:
- `login(data: LoginRequest): Promise<AuthResponse>`
- `register(data: RegisterRequest): Promise<AuthResponse>`
- `googleLogin(idToken: string): Promise<AuthResponse>`
- `getMe(): Promise<User>`
- `saveToken(token: string): void`
- `getToken(): string | null`
- `isAuthenticated(): boolean`
- `logout(): void`

### documentService.ts
**Document CRUD operations**

Methods:
- `getMyDocuments(): Promise<Document[]>`
- `getPublicDocuments(): Promise<Document[]>`
- `getDocument(id: string): Promise<Document>`
- `createDocument(formData: FormData): Promise<Document>`
- `updateDocument(id: string, data: Partial<CreateDocumentRequest>): Promise<Document>`
- `deleteDocument(id: string): Promise<void>`
- `shareDocument(id: string, email: string, permission: PermissionType): Promise<DocumentShare>`
- `removeShare(docId: string, shareId: string): Promise<void>`
- `getShares(docId: string): Promise<DocumentShare[]>`

### pageService.ts
**Page retrieval and preprocessing**

Methods:
- `getPages(documentId: string): Promise<Page[]>`
- `getPage(documentId: string, pageId: string): Promise<Page>`
- `preprocessPage(documentId: string, pageId: string, operations: string[]): Promise<Page>`
- `getPageImage(documentId: string, pageId: string): Promise<Blob>`
- `getPageProcessedImage(documentId: string, pageId: string): Promise<Blob>`

### annotationService.ts
**Annotation CRUD operations**

Methods organized by entity:

**Sections:**
- `createSection(pageId: string, data: CreateSectionData): Promise<SectionAnnotation>`
- `updateSection(pageId: string, sectionId: string, data: Partial<CreateSectionData>): Promise<SectionAnnotation>`
- `deleteSection(pageId: string, sectionId: string): Promise<void>`

**Pairs:**
- `createPair(pageId: string, sectionId: string, data: CreatePairData): Promise<PairAnnotation>`
- `updatePair(pageId: string, pairId: string, data: Partial<CreatePairData>): Promise<PairAnnotation>`
- `deletePair(pageId: string, pairId: string): Promise<void>`

**Elements:**
- `createElement(pageId: string, pairId: string, data: CreateElementData): Promise<ElementAnnotation>`
- `updateElement(pageId: string, elementId: string, data: Partial<CreateElementData>): Promise<ElementAnnotation>`
- `deleteElement(pageId: string, elementId: string): Promise<void>`

**Bounding Boxes:**
- `updateBoundingBox(pageId: string, boxId: string, data: BoundingBox): Promise<BoundingBox>`
- `updateBoundingBoxes(pageId: string, updates: Array<{id: string; box: BoundingBox}>): Promise<BoundingBox[]>`

### symbolService.ts
**Symbol management**

Methods:
- `getSymbols(code?: string): Promise<Symbol[]>`
- `getSymbol(id: string): Promise<Symbol>`
- `createSymbol(formData: FormData): Promise<Symbol>`
- `updateSymbol(id: string, data: Partial<Symbol>): Promise<Symbol>`
- `deleteSymbol(id: string): Promise<void>`
- `getSymbolImage(id: string): Promise<Blob>`
- `searchSymbols(query: string): Promise<Symbol[]>`

### exportService.ts
**Dataset export operations**

Methods:
- `exportCoco(data: ExportRequest): Promise<Blob>`
- `exportYolo(data: ExportRequest): Promise<Blob>`
- `getExportStatus(exportId: string): Promise<{...}>`
- `cancelExport(exportId: string): Promise<void>`
- `downloadBlob(blob: Blob, filename: string): void`

## Context

### AuthContext.tsx
**React context for authentication state**

Provides:
- `user: User | null`
- `token: string | null`
- `isAuthenticated: boolean`
- `isLoading: boolean`
- `error: string | null`

Methods:
- `login(data: LoginRequest): Promise<void>`
- `register(data: RegisterRequest): Promise<void>`
- `googleLogin(idToken: string): Promise<void>`
- `logout(): void`
- `clearError(): void`

**Features:**
- Initializes auth state from localStorage on mount
- Validates token by calling getMe()
- Automatically clears invalid tokens
- Persists user and token to localStorage

## Hooks

### useAuth()
**Access authentication context**

Returns `AuthContextType` with all auth state and methods.

```typescript
import { useAuth } from '@/hooks';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  // ...
}
```

### useDocuments()
**Document operations and state**

Returns:
- `documents: Document[]`
- `loading: boolean`
- `error: string | null`
- `fetchDocuments(type?: 'my' | 'public'): Promise<void>`
- `createDocument(formData: FormData): Promise<Document>`
- `updateDocument(id: string, data: Partial<CreateDocumentRequest>): Promise<Document>`
- `deleteDocument(id: string): Promise<void>`
- `getDocument(id: string): Promise<Document>`
- `clearError(): void`

```typescript
import { useDocuments } from '@/hooks';

function DocumentsList() {
  const { documents, loading, fetchDocuments } = useDocuments();

  useEffect(() => {
    fetchDocuments('my');
  }, []);

  if (loading) return <div>Loading...</div>;
  return documents.map(doc => <div key={doc.id}>{doc.title}</div>);
}
```

### usePages()
**Page operations and state**

Returns:
- `pages: Page[]`
- `currentPage: Page | null`
- `loading: boolean`
- `error: string | null`
- `fetchPages(documentId: string): Promise<void>`
- `fetchPage(documentId: string, pageId: string): Promise<void>`
- `preprocessPage(documentId: string, pageId: string, operations: string[]): Promise<void>`
- `setCurrentPage(page: Page | null): void`
- `clearError(): void`

### useAnnotations()
**Annotation operations and state**

Returns:
- `sections: SectionAnnotation[]`
- `loading: boolean`
- `error: string | null`
- All CRUD methods for sections, pairs, elements, and bounding boxes

## Usage Patterns

### Setup in main.tsx

```typescript
import { AuthProvider } from '@/context';

function App() {
  return (
    <AuthProvider>
      <YourRoutes />
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

### In Components

```typescript
import { useAuth, useDocuments } from '@/hooks';

function MyComponent() {
  const { user, login } = useAuth();
  const { documents, fetchDocuments, createDocument } = useDocuments();

  useEffect(() => {
    if (user) {
      fetchDocuments('my');
    }
  }, [user]);

  return (
    <>
      <h1>Welcome {user?.name}</h1>
      {documents.map(doc => (
        <div key={doc.id}>{doc.title}</div>
      ))}
    </>
  );
}
```

## Error Handling

Services throw errors that propagate to hooks. Hooks catch errors and store in `error` state:

```typescript
const { documents, error, clearError } = useDocuments();

try {
  await fetchDocuments();
} catch (err) {
  console.error('Failed to fetch:', error);
}

// Clear error after handling
clearError();
```

## State Management

Current implementation uses React hooks with local state. For larger apps, consider:
- **Zustand**: Lightweight store for global state
- **Redux**: Full-featured state management
- **React Query**: Optimized server state management

## API Response Interceptors

The axios instance automatically:
1. Attaches JWT token to all requests
2. Handles 401 responses by clearing auth and redirecting
3. Logs errors for debugging
4. Supports multipart/form-data for file uploads

## TypeScript Support

All services and hooks are fully typed:
- Type-safe API calls
- Intellisense support
- Compile-time error catching
