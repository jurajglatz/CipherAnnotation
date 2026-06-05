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
      { title: 'Preprocess', desc: 'Binarize, boost contrast, rotate — one click.' },
      { title: 'Annotate', desc: 'Mark each symbol and assign a value from your library.' },
      { title: 'Export', desc: 'Download the dataset as COCO or YOLO and start training.' },
    ],
  },
  features: {
    title: 'Everything you need',
    subtitle: 'Built around a real research workflow.',
    items: [
      { title: 'Image preprocessing', desc: 'Binarize, adjust contrast, rotate — right in your browser.' },
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
    statLabel: 'Faster than existing solutions',
    statValue: '2.5×',
    statUnit: 'faster annotation',
    statBody:
      'CipherAnnotation speeds up cipher annotation by up to 2.5× compared to existing tools. Annotate a 40-page Copiale collection over a weekend, export to YOLO, and train on your own GPU.',
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

export const carouselSlides: CarouselSlide[] = [
  {
    filename: 'upload.png',
    caption: 'Upload your manuscript pages',
    src: '/landing/upload.png',
  },
  {
    filename: 'preprocess.png',
    caption: 'Preprocess and prepare each page',
    src: '/landing/preprocess.png',
  },
  {
    filename: 'annotate.png',
    caption: 'Annotate cipher symbols in place',
    src: '/landing/annotate.png',
  },
  {
    filename: 'symbol-gallery.png',
    caption: 'Browse and reuse your symbol library',
    src: '/landing/symbol-gallery.png',
  },
];
