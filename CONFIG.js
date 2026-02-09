/**
 * THE PROPERTY BRIEF - Configuration Constants
 * All magic numbers and configuration in one place
 * Last updated: 2026-02-09
 */

const CONFIG = {
  // Search Settings
  SEARCH: {
    MIN_LENGTH: 3,
    MAX_RESULTS: 25,
    DEFAULT_DATE_RANGE_DAYS: 30,
    EXCERPT_LENGTH: 180,
    SNIPPET_LENGTH: 120,
    SNIPPET_CONTEXT_BEFORE: 40,
    SNIPPET_CONTEXT_AFTER: 60,
  },

  // Toast Notifications
  TOAST: {
    DURATION_MS: 1200,
    FADE_OUT_MS: 250,
  },

  // Sponsored Ads Rotation
  SPONSORED: {
    ROTATION_INTERVAL_MS: 5000,
  },

  // Posts Loading
  POSTS: {
    INITIAL_LOAD: 4,
    LOAD_MORE_INCREMENT: 4,
  },

  // PDF Viewer
  PDF: {
    WORKER_URL: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs',
    MIN_CANVAS_WIDTH: 320,
    DEFAULT_CANVAS_WIDTH: 600,
    SWIPE_THRESHOLD: 40,
  },

  // Modal
  MODAL: {
    MAX_WIDTH: '920px',
    MAX_HEIGHT: '85vh',
  },

  // Advertise Modal Countdown
  ADVERTISE: {
    COUNTDOWN_SECONDS: 10,
    COUNTDOWN_INTERVAL_MS: 1000,
  },

  // Slider (projects page)
  SLIDER: {
    AUTO_SLIDE_INTERVAL_MS: 5000,
  },

  // API Endpoints
  API: {
    POSTS_JSON: 'posts.json',
    PROJECTS_JSON: 'data/projects.json',
    PROJECTS_HERO_JSON: 'content/settings/projects-hero.json',
    STATES_JSON: '/content/settings/locations/states.json',
    DISTRICTS_JSON: '/content/settings/locations/districts.json',
    AREAS_BASE_PATH: '/content/settings/locations/areas/',
  },

  // Cache Settings
  CACHE: {
    NO_STORE: { cache: 'no-store' },
  },

  // Date Formatting
  DATE_FORMAT: {
    locale: 'en-US',
    options: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  },
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
