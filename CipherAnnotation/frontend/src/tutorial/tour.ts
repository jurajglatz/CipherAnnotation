/**
 * Tutorial tour using driver.js.
 *
 * Steps are split into groups by route. The tour persists progress in
 * localStorage so it can resume across page navigations (driver.js itself
 * is destroyed when the DOM unmounts on route change).
 */

import { driver, Driver, DriveStep } from 'driver.js';

const STORAGE_KEY = 'cipher-tour';

type TourState = {
  active: boolean;
  group: TourGroup;
  step: number;
};

export type TourGroup =
  | 'documents'
  | 'document-detail'
  | 'annotation'
  | 'public-documents'
  | 'symbols'
  | 'symbol-caption'
  | 'symbol-detail'
  | 'profile';

type TourStep = DriveStep & {
  /** Optional advance hint shown when the highlighted element triggers navigation. */
  waitForNavigation?: boolean;
};

const groups: Record<TourGroup, TourStep[]> = {
  documents: [
    {
      element: '[data-tour="new-document"]',
      popover: {
        title: 'Create a document',
        description:
          'Click here to start a new document. You\'ll give it a title and optional metadata, then add pages.',
      },
    },
    {
      element: '[data-tour="documents-search"]',
      popover: {
        title: 'Find documents',
        description:
          'Search by title or description and filter by visibility once your library grows.',
      },
    },
    {
      element: '[data-tour="document-card"]',
      popover: {
        title: 'Open a document',
        description:
          'Click any document card to open its detail view, where you can manage pages and annotations.',
      },
      waitForNavigation: true,
    },
  ],
  'document-detail': [
    {
      element: '[data-tour="add-pages"]',
      popover: {
        title: 'Add pages',
        description:
          'Upload one or more images here. Each becomes a page you can annotate.',
      },
    },
    {
      element: '[data-tour="share-button"]',
      popover: {
        title: 'Share the document',
        description:
          'Invite collaborators by email and pick what they can do (view, annotate, manage).',
      },
    },
    {
      element: '[data-tour="view-mode-toggle"]',
      popover: {
        title: 'Grid or list',
        description:
          'Switch between a grid of large thumbnails and a compact list. Toggles next to it hide annotations or swap between original and processed images.',
      },
    },
    {
      element: '[data-tour="page-thumb"]',
      popover: {
        title: 'Annotate a page',
        description:
          'Click a page thumbnail to open the annotation editor.',
      },
      waitForNavigation: true,
    },
    {
      element: '[data-tour="export-button"]',
      popover: {
        title: 'Export your dataset',
        description:
          'Once you\'ve annotated pages, export the dataset as COCO, YOLO, or TFRecord — choose a variant, train/test split, and which captions to include.',
      },
    },
  ],
  annotation: [
    {
      element: '[data-tour="annotation-toolbar"]',
      popover: {
        title: 'Annotation toolbar',
        description:
          'Pick a tool (select, box, polygon), zoom, undo/redo, jump between pages, open preprocessing, and trigger auto-annotation.',
      },
    },
    {
      element: '[data-tour="annotation-tree"]',
      popover: {
        title: 'Annotation tree',
        description:
          'Browse the hierarchy of annotations. Select, duplicate, lock, or delete entries here — nested boxes/polygons share parents.',
      },
    },
    {
      element: '[data-tour="annotation-canvas"]',
      popover: {
        title: 'The canvas',
        description:
          'Draw bounding boxes or polygons here. Selected annotations can be moved or resized directly on the page.',
      },
    },
    {
      element: '[data-tour="annotation-side-panel"]',
      popover: {
        title: 'Captions & properties',
        description:
          'Create captions (class labels) and assign them to annotations. Edit the selected annotation\'s details in the properties panel below.',
      },
    },
  ],
  'public-documents': [
    {
      element: '[data-tour="public-search"]',
      popover: {
        title: 'Browse the public library',
        description:
          'Search documents the community has published. Anyone signed in can open and explore them.',
      },
    },
    {
      element: '[data-tour="public-document-card"]',
      popover: {
        title: 'Open a public document',
        description:
          'Click a card to view its pages and annotations. You can duplicate it from your own documents page to start editing your own copy.',
      },
    },
  ],
  symbols: [
    {
      element: '[data-tour="symbols-scope"]',
      popover: {
        title: 'Scope',
        description:
          'Limit symbols to your own documents, ones shared with you, the public library, or everything you can see.',
      },
    },
    {
      element: '[data-tour="symbols-doc-slicer"]',
      popover: {
        title: 'Filter by document',
        description:
          'Pick one or more documents to narrow the grid. Combine this with the search box above to find specific symbols.',
      },
    },
    {
      element: '[data-tour="symbol-card"]',
      popover: {
        title: 'Caption groups',
        description:
          'Symbols are grouped by caption. Click a card to drill into the caption (or into the Uncategorized bucket for unlabelled tiles).',
      },
      waitForNavigation: true,
    },
  ],
  'symbol-caption': [
    {
      element: '[data-tour="caption-image"]',
      popover: {
        title: 'Canonical drawing',
        description:
          'A single shared drawing that represents this caption. The owner can redraw it — or create one if none exists yet.',
      },
    },
    {
      element: '[data-tour="caption-name"]',
      popover: {
        title: 'Rename the caption',
        description:
          'Saving renames every symbol and annotation you own that shares this caption. Items you can\'t edit are left untouched.',
      },
    },
    {
      element: '[data-tour="caption-tile-grid"]',
      popover: {
        title: 'All items',
        description:
          'Every symbol and annotation in this group, split by whether it\'s yours, shared, or public. Set content per tile to move it elsewhere.',
      },
    },
  ],
  'symbol-detail': [
    {
      element: '[data-tour="symbol-detail-image"]',
      popover: {
        title: 'Canonical drawing',
        description:
          'The shared symbol artwork. If you own it, the pencil button opens a whiteboard to redraw it.',
      },
    },
    {
      element: '[data-tour="symbol-detail-content"]',
      popover: {
        title: 'Content',
        description:
          'The class label/caption. Saving propagates to every symbol you own under the same caption.',
      },
    },
    {
      element: '[data-tour="symbol-occurrences"]',
      popover: {
        title: 'Occurrences',
        description:
          'Every annotation that references this symbol. Click one to jump straight to it inside the annotation editor.',
      },
    },
  ],
  profile: [
    {
      element: '[data-tour="profile-card"]',
      popover: {
        title: 'Your account',
        description:
          'Email, role and member-since date. Sign out from the top navigation when you\'re done.',
      },
    },
    {
      element: '[data-tour="profile-admin-settings"]',
      popover: {
        title: 'Admin settings',
        description:
          'Admin-only toggles such as the AI-assisted symbol content generator that affect every user of the app.',
      },
    },
  ],
};

let activeDriver: Driver | null = null;
let suppressDismissCleanup = false;

const readState = (): TourState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TourState) : null;
  } catch {
    return null;
  }
};

const writeState = (state: TourState | null) => {
  if (state === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const destroyActive = () => {
  if (activeDriver) {
    suppressDismissCleanup = true;
    activeDriver.destroy();
    activeDriver = null;
    suppressDismissCleanup = false;
  }
};

/**
 * Drive the steps for a given group. If a step's target element is not present
 * in the DOM (e.g., the user has no documents yet), it is skipped silently.
 */
const driveGroup = (group: TourGroup, startStep = 0) => {
  destroyActive();

  const steps = groups[group].filter((s) => {
    const selector = typeof s.element === 'string' ? s.element : null;
    if (!selector) return true;
    return document.querySelector(selector) !== null;
  });

  if (steps.length === 0) {
    writeState(null);
    return;
  }

  const safeStart = Math.min(startStep, steps.length - 1);

  activeDriver = driver({
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    steps,
    onCloseClick: () => {
      writeState(null);
      destroyActive();
    },
    onDestroyed: () => {
      activeDriver = null;
      if (!suppressDismissCleanup) {
        writeState(null);
      }
    },
    onHighlightStarted: (_el, _step, opts) => {
      writeState({ active: true, group, step: opts.state.activeIndex ?? 0 });
    },
  });

  activeDriver.drive(safeStart);
};

export const startTour = (group: TourGroup = 'documents') => {
  writeState({ active: true, group, step: 0 });
  driveGroup(group, 0);
};

export const stopTour = () => {
  writeState(null);
  destroyActive();
};

/**
 * Called by `useTour` on each page mount. If the saved state matches this
 * group, resume from the saved step.
 */
export const maybeResumeTour = (group: TourGroup) => {
  const state = readState();
  if (!state || !state.active) return;

  if (state.group === group) {
    // small delay so React has committed the DOM
    requestAnimationFrame(() => driveGroup(group, state.step));
    return;
  }

  // Different group than expected → user navigated forward. Move tour to this group.
  writeState({ active: true, group, step: 0 });
  requestAnimationFrame(() => driveGroup(group, 0));
};
