/* ========================================
   THE PROPERTY BRIEF — Configuration
   All magic numbers and constants in one place
======================================== */

export const CONFIG = {
  // Search
  MIN_SEARCH_LENGTH: 3,
  MAX_SEARCH_RESULTS: 25,
  SEARCH_SNIPPET_LENGTH: 120,
  DEFAULT_DATE_RANGE_DAYS: 30,
  
  // UI Timings
  TOAST_DURATION: 1200,
  TOAST_FADE_OUT: 250,
  SPONSORED_ROTATION_INTERVAL: 5000,
  SLIDER_ROTATION_INTERVAL: 5000,
  ADVERTISE_MODAL_COUNTDOWN: 10,
  
  // Rendering
  INITIAL_POSTS_PER_SECTION: 4,
  LOAD_MORE_INCREMENT: 4,
  EXCERPT_MAX_LENGTH: 180,
  SNIPPET_CONTEXT_BEFORE: 40,
  SNIPPET_CONTEXT_AFTER: 60,
  
  // PDF Viewer
  PDF_WORKER_URL: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs',
  PDF_MIN_CANVAS_WIDTH: 320,
  PDF_DEFAULT_WIDTH: 600,
  PDF_SWIPE_THRESHOLD: 40,
  
  // Breakpoints (sync with CSS)
  BREAKPOINT_MOBILE: 600,
  BREAKPOINT_TABLET: 820,
  BREAKPOINT_DESKTOP: 1024,
  
  // Defaults
  DEFAULT_TAG: 'Update',
  DEFAULT_SECTION: 'all',
  
  // External URLs
  YOUTUBE_THUMBNAIL_BASE: 'https://img.youtube.com/vi/',
  YOUTUBE_EMBED_BASE: 'https://www.youtube.com/embed/',
  
  // Paths
  POSTS_JSON_PATH: 'posts.json',
  PROJECTS_JSON_PATH: 'data/projects.json',
  HERO_SLIDER_JSON_PATH: 'content/settings/projects-hero.json',
  STATES_JSON_PATH: '/content/settings/locations/states.json',
  DISTRICTS_JSON_PATH: '/content/settings/locations/districts.json',
  AREAS_JSON_BASE: '/content/settings/locations/areas/',
};

// Freeze to prevent accidental mutation
Object.freeze(CONFIG);