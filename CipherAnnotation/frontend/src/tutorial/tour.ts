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

export type TourGroup = 'documents' | 'document-detail' | 'annotation';

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
          'Once you\'ve annotated pages, export the dataset as COCO, YOLO, or TFRecord.',
      },
    },
  ],
  annotation: [
    {
      element: '[data-tour="annotation-toolbar"]',
      popover: {
        title: 'Annotation toolbar',
        description:
          'Pick a tool (select, box, polygon), zoom, switch between original/processed images, and jump between pages.',
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
