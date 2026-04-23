# Document Management Components

Complete document management system for CipherAnnotation frontend with Tailwind CSS and React.

## Components

### DocumentCard.tsx
Reusable document card component for displaying document information in grid/list views.

**Props:**
- `document: Document` - Document data
- `onView: (doc: Document) => void` - View button callback
- `onEdit: (doc: Document) => void` - Edit button callback
- `onDelete: (doc: Document) => void` - Delete button callback
- `onShare: (doc: Document) => void` - Share button callback

**Features:**
- Document thumbnail placeholder with icon
- Visibility badge (Private/Public)
- Page count badge
- Document metadata (author, language, country)
- Hover effects with shadow transitions
- Action buttons (View, Edit, Share, Delete)
- Created date formatting

### CreateDocumentModal.tsx
Modal form for creating new documents with file uploads.

**Props:**
- `isOpen: boolean` - Modal visibility
- `onClose: () => void` - Close callback
- `onSuccess: () => void` - Success callback for refreshing documents list

**Features:**
- Form fields: Title (required), Description, Origin Country, Author, Language, Visibility
- Drag & drop file upload area (PNG, JPG, TIFF)
- File preview thumbnails with page numbers
- File reordering with arrow buttons
- File removal capability
- FormData submission for multipart uploads
- Loading states and error handling
- Toast notifications for user feedback

### ShareDocumentModal.tsx
Modal for sharing documents with other users and managing permissions.

**Props:**
- `documentId: string` - Document ID
- `isOpen: boolean` - Modal visibility
- `onClose: () => void` - Close callback

**Features:**
- Email address input with validation
- Permission selection (Read / Edit)
- List of current shares with remove buttons
- Fetches existing shares on open
- Integration with documentService
- Error handling and notifications
- Scrollable share list

### PageThumbnail.tsx
Reusable page thumbnail component with lazy loading and status indicators.

**Props:**
- `page: Page` - Page data
- `documentId: string` - Document ID (for context)
- `onClick?: () => void` - Click handler
- `isSelected?: boolean` - Selection state for preprocessing
- `showProcessingStatus?: boolean` - Show processing status indicator

**Features:**
- Lazy image loading with spinner
- Page number overlay
- Image dimensions and DPI display
- Processing status indicator (Pending, Processing, Completed, Error)
- Selection indicator with checkmark
- Hover overlay effect
- Error handling with fallback UI
- Responsive aspect ratio

## Pages

### DocumentsPage.tsx
Main documents list page with search, filtering, and grid layout.

**Features:**
- Header with "My Documents" title and "New Document" button
- Search bar for filtering by title/description
- Visibility filter (All/Private/Public)
- Responsive grid layout (1 col mobile, 2 cols tablet, 3 cols desktop)
- Document cards with actions
- Empty state when no documents
- Loading spinner during fetch
- Delete confirmation dialog
- Create document modal
- Share modal
- Error toast notifications
- Integration with useDocuments hook

**Data Flow:**
1. Component mounts → fetch documents via useDocuments
2. User types search/filters → re-filter documents array
3. User clicks card → navigate to /documents/:id
4. User clicks "New Document" → open CreateDocumentModal
5. On success → refresh documents list, show toast
6. User clicks delete → show ConfirmDialog
7. On confirm → delete via service, remove from list, show toast

### DocumentDetailPage.tsx
Document detail view with pages, preprocessing, and export.

**Features:**
- Header with document title, metadata, and action buttons
- Page thumbnails in grid or list view
- View mode toggle (Grid/List)
- Preprocessing section with:
  - Page selection
  - Operation selection (binarize, threshold, contrast, deskew, rotate, denoise, scale, grayscale)
  - Apply button for batch processing
- Export section with:
  - Format selection (COCO/YOLO)
  - Train/test split slider
  - Export button
- Add Pages button
- Share, Edit, and Delete actions
- Integration with pageService for image operations
- Error handling and loading states

**Data Flow:**
1. Component mounts → fetch document + pages
2. User clicks page thumbnail → navigate to annotation view
3. User selects pages + operations → preprocess
4. User selects format + split → export dataset
5. User clicks Share/Edit/Delete → open respective modals/dialogs

## Usage

### Basic Grid View
```tsx
import { DocumentsPage } from '@/pages/DocumentsPage';

// In your router
<Route path="/documents" element={<DocumentsPage />} />
```

### Creating a Document
```tsx
import { CreateDocumentModal } from '@/components/documents';

const [isOpen, setIsOpen] = useState(false);

<CreateDocumentModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSuccess={() => {
    setIsOpen(false);
    fetchDocuments();
  }}
/>
```

### Sharing a Document
```tsx
import { ShareDocumentModal } from '@/components/documents';

const [isOpen, setIsOpen] = useState(false);
const [docId, setDocId] = useState('');

<ShareDocumentModal
  documentId={docId}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

### Document Card
```tsx
import { DocumentCard } from '@/components/documents';

<DocumentCard
  document={doc}
  onView={(doc) => navigate(`/documents/${doc.id}`)}
  onEdit={(doc) => navigate(`/documents/${doc.id}/edit`)}
  onDelete={(doc) => setDocToDelete(doc)}
  onShare={(doc) => setSelectedDoc(doc)}
/>
```

### Page Thumbnails
```tsx
import { PageThumbnail } from '@/components/documents';

{pages.map((page) => (
  <PageThumbnail
    key={page.id}
    page={page}
    documentId={documentId}
    onClick={() => navigate(`/documents/${documentId}/pages/${page.id}`)}
    isSelected={selected.includes(page.id)}
    showProcessingStatus={true}
  />
))}
```

## Dependencies

- `react` - Core React library
- `react-router-dom` - Client-side routing
- `lucide-react` - Icon library
- `react-hot-toast` - Toast notifications
- `tailwindcss` - Styling framework
- `@/types` - TypeScript type definitions
- `@/services` - API services
- `@/hooks` - Custom hooks
- `@/components/shared` - Shared components (Modal, ConfirmDialog, LoadingSpinner)

## Type Definitions

All components use types from `@/types/index.ts`:

- `Document` - Document metadata
- `Page` - Page information
- `DocumentShare` - Share configuration
- `Visibility` - 'Private' | 'Public'
- `PermissionType` - 'Read' | 'Edit'

## API Integration

Components integrate with services in `@/services/`:

- `documentService.getMyDocuments()` - Fetch user documents
- `documentService.getDocument(id)` - Fetch single document
- `documentService.createDocument(formData)` - Create document
- `documentService.deleteDocument(id)` - Delete document
- `documentService.shareDocument(id, email, permission)` - Share document
- `documentService.removeShare(docId, shareId)` - Remove share
- `documentService.getShares(docId)` - Get document shares
- `pageService.getPages(documentId)` - Fetch document pages
- `pageService.preprocessPage(documentId, pageId, operations)` - Preprocess page

## Styling

All components use Tailwind CSS with the following color scheme:

- **Primary (Blue):** `bg-blue-600`, `hover:bg-blue-700`, `text-blue-600`
- **Success (Green):** `bg-green-600`, `text-green-600`
- **Danger (Red):** `bg-red-600`, `text-red-600`
- **Warning (Yellow):** `bg-yellow-100`, `text-yellow-700`
- **Secondary (Gray):** `bg-gray-100`, `text-gray-700`
- **Purple (Utility):** `bg-purple-50`, `text-purple-600`

## Error Handling

All components implement comprehensive error handling:

- API errors are caught and displayed via toast notifications
- Loading states prevent multiple submissions
- Form validation prevents invalid submissions
- Graceful fallbacks for missing data
- Error messages in UI

## Accessibility

Components follow accessibility best practices:

- Semantic HTML (buttons, labels, forms)
- ARIA attributes where appropriate
- Keyboard navigation support
- Focus states for interactive elements
- Screen reader friendly (alt text for images)
- Form labels properly associated

## Performance

Optimizations included:

- Lazy loading for page thumbnails
- Memoization where beneficial
- Event delegation where applicable
- Efficient re-renders with proper state management
- Image optimization with object-fit
