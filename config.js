/**
 * THE PROPERTY BRIEF - Configuration Constants
 * All magic numbers and configuration in one place
 * Loaded globally via <script> tag in HTML
 * Last updated: 2026-02-16
 */

const CONFIG = {
  // Search Settings
  SEARCH: {
    MIN_LENGTH: 3,
    MAX_RESULTS: 25,
    EXCERPT_LENGTH: 180,
    SNIPPET_LENGTH: 120,
    SNIPPET_CONTEXT_BEFORE: 40,
    SNIPPET_CONTEXT_AFTER: 60,
    DEFAULT_DATE_RANGE_DAYS: 30,
  },

  // Toast Notifications
  TOAST: {
    DURATION_MS: 1200,
    FADE_OUT_MS: 250,
  },

  // Sponsored Ads & Slider
  SPONSORED: {
    ROTATION_INTERVAL_MS: 5000,
  },

  SLIDER: {
    AUTO_SLIDE_INTERVAL_MS: 5000,
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

  // Advertise Modal
  ADVERTISE: {
    COUNTDOWN_SECONDS: 10,
    COUNTDOWN_INTERVAL_MS: 1000,
  },

  // API Endpoints
  API: {
    POSTS_JSON: 'posts.json',

    // LIVE GOOGLE SHEET ENDPOINT (Your new Backend)
    // This handles both LOADING listings (GET) and SUBMITTING ads (POST)
    PROJECTS_JSON: 'https://script.google.com/macros/s/AKfycbz5ok2RE-YFLkCASmlBDtPnc8WnKpnHjlFvDdFa0XqWJv_BGiaPN0B84Lo66GMwmXjo/exec',
    
    // AD BIDDING ENDPOINT (Separate Sheet for security)
    AD_BID_URL: 'https://script.google.com/macros/s/AKfycbxImoegOMJ4tuL6IQNpMVprW30f8LrtNCO5LSgveXEZOAXyAqAt1-dVsK3cfo2PbEwIDQ/exec',

    PROJECTS_HERO_JSON: 'content/settings/projects-hero.json',
    STATES_JSON: '/content/settings/locations/states.json',
    DISTRICTS_JSON: '/content/settings/locations/districts.json',
    AREAS_BASE_PATH: '/content/settings/locations/areas/',
  },

  // Cache Settings
  CACHE: {
    // Google Scripts don't support 'no-store' well, so we use default
    DEFAULT: {}, 
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

// Freeze to prevent accidental mutation
Object.freeze(CONFIG);