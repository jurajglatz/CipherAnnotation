export const copy = {
  nav: {
    features: 'Features',
    about: 'About',
    login: 'Log in',
    signup: 'Sign up',
  },
  hero: {
    eyebrow: 'An annotation tool for historical ciphers',
    titleA: 'Decode the past,',
    titleB: 'one symbol',
    titleC: 'at a time.',
    subtitle:
      'From a scanned manuscript to an ML-ready training dataset — all in one place.',
    ctaPrimary: 'Get started',
    ctaSecondary: 'Explore features',
    trust: 'Open-source · FEI STU academic project · COCO / YOLO export',
  },
  how: {
    title: 'How it works',
    subtitle: 'Four steps from a scan to a dataset.',
    steps: [
      { title: 'Upload', desc: 'Drop in a scan of your cipher manuscript — PDF or image.' },
      { title: 'Preprocess', desc: 'Binarize, deskew, boost contrast, rotate — one click.' },
      { title: 'Annotate', desc: 'Mark each symbol and assign a value from your library.' },
      { title: 'Export', desc: 'Download the dataset as COCO or YOLO and start training.' },
    ],
  },
  features: {
    title: 'Everything you need',
    subtitle: 'Built around a real research workflow.',
    items: [
      { title: 'Image preprocessing', desc: 'Binarize, deskew, adjust contrast, rotate — right in your browser.' },
      { title: 'Symbol library', desc: 'Curate your own collection of symbols with consistent values.' },
      { title: 'Multi-page documents', desc: 'Manage whole manuscripts, not just single pages.' },
      { title: 'Collaboration', desc: 'Share documents with colleagues and annotate together.' },
      { title: 'Public library', desc: 'Open datasets for academic research.' },
      { title: 'ML export', desc: 'COCO and YOLO formats — ready to train detectors.' },
    ],
  },
  research: {
    title: 'Built for research',
    body:
      'CipherAnnotation is a bachelor thesis project at the Faculty of Electrical Engineering and Information Technology, STU Bratislava. It bridges historical cryptology and computer vision — annotations produced here can directly train detection models.',
    quoteTitle: 'A typical use-case',
    quote:
      '"A 40-page Copiale collection — annotated over a weekend. YOLO export, straight to training on an RTX. Without CipherAnnotation this would take a month."',
    quoteAuthor: '— a hypothetical researcher (soon you?)',
  },
  cta: {
    title: 'Ready to start?',
    subtitle: 'Create an account in 30 seconds. Free forever for academic use.',
    primary: 'Create account',
    secondary: 'View on GitHub',
  },
  footer: {
    tagline: 'An annotation tool for historical ciphers.',
    rights: 'All rights reserved.',
    madeAt: 'Bachelor thesis · FEI STU Bratislava',
    links: { github: 'GitHub', contact: 'Contact' },
  },
} as const;

export type Copy = typeof copy;

export type BoxColor = 'red' | 'green' | 'sepia';

export interface AnnotationBox {
  /** position/size as % of the canvas */
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  color: BoxColor;
}

export interface CarouselSlide {
  /** shown in the window title bar */
  filename: string;
  caption?: string;
  /** real screenshot — drop files in public/landing/ and set this later */
  src?: string;
  /** placeholder canvas rows (used only when src is absent) */
  glyphs?: string[];
  /** placeholder annotation boxes (used only when src is absent) */
  boxes?: AnnotationBox[];
}

// Placeholder slides — replace each `glyphs`/`boxes` mock with `src: '/landing/<file>.png'`
// once real screenshots are added to public/landing/.
export const carouselSlides: CarouselSlide[] = [
  {
    filename: 'copiale_p12.png',
    caption: 'Annotating the Copiale cipher',
    glyphs: ['⚿ ◈ ⊕ ✶ ⟁', '◇ ⊗ ✦ ⟐ ⊕', '⊕ ⟁ ◈ ✶ ◇', '✦ ⊗ ◇ ⟐ ⚿'],
    boxes: [
      { x: 8, y: 10, width: 15, height: 16, value: 'A', color: 'red' },
      { x: 42, y: 30, width: 13, height: 16, value: 'K', color: 'green' },
      { x: 66, y: 52, width: 14, height: 14, value: '?', color: 'sepia' },
      { x: 18, y: 70, width: 12, height: 15, value: 'T', color: 'red' },
    ],
  },
  {
    filename: 'manuscript_07.png',
    caption: 'Symbol values from your library',
    glyphs: ['✶ ⟐ ◈ ⊕ ✦', '⚿ ◇ ⊗ ⟁ ◈', '◈ ✦ ⊕ ◇ ⊗', '⟁ ⊕ ✶ ⚿ ◇'],
    boxes: [
      { x: 12, y: 16, width: 13, height: 15, value: 'M', color: 'green' },
      { x: 50, y: 22, width: 14, height: 16, value: 'E', color: 'red' },
      { x: 30, y: 58, width: 13, height: 15, value: 'S', color: 'sepia' },
      { x: 64, y: 66, width: 12, height: 15, value: 'R', color: 'green' },
    ],
  },
  {
    filename: 'cipher_export.png',
    caption: 'Ready for COCO / YOLO export',
    glyphs: ['◇ ⊗ ⚿ ⟐ ✶', '⊕ ◈ ✦ ⟁ ◇', '✶ ⚿ ◇ ⊗ ◈', '⟐ ✦ ⊕ ⟁ ⚿'],
    boxes: [
      { x: 10, y: 24, width: 14, height: 16, value: 'C', color: 'sepia' },
      { x: 44, y: 14, width: 13, height: 15, value: 'O', color: 'red' },
      { x: 58, y: 50, width: 14, height: 16, value: 'D', color: 'green' },
      { x: 24, y: 64, width: 12, height: 14, value: 'E', color: 'red' },
    ],
  },
];
