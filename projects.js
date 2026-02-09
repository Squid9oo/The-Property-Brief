/* ========================================
   THE PROPERTY BRIEF — projects.js (Refactored)
   Property listings page with complete fixes:
   - No memory leaks (cleanup timers)
   - Event delegation (no inline onclick)
   - Loading states for filters
   - Proper error handling with user feedback
   - Constants from config.js
======================================== */

import { CONFIG } from './config.js';
import { initHamburgerMenu } from './menu.js';

// Initialize hamburger menu
initHamburgerMenu('hamburgerProjects', 'mainNavProjects');

// ============ STATE ============
let allProperties = []; 
let currentSlideIndex = 0;
let sliderTimer = null;
let adminSlides = [];

// ============ CLEANUP ============

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (sliderTimer) clearInterval(sliderTimer);
});

// ============ HERO SLIDER ============

/**
 * Load hero slider configuration from JSON
 */
async function loadAdminHeroSlider() {
  const container = document.getElementById('admin-slider-container');
  const dotsContainer = document.getElementById('slider-dots');
  if (!container) return;

  try {
    const res = await fetch(CONFIG.HERO_SLIDER_JSON_PATH, { cache: 'no-store' });
    if (!res.ok) return;
    
    const data = await res.json();
    adminSlides = data.slides || [];

    if (adminSlides.length === 0) return;

    // Render slides with data attributes (no inline onclick)
    container.innerHTML = adminSlides.map((slide, index) => `
      <div class="hero-slide ${index === 0 ? 'active' : ''}" 
           data-slide-index="${index}"
           data-slide-link="${slide.link || ''}"
           style="--img-d: url('${slide.desktop}'); --img-t: url('${slide.tablet}'); --img-m: url('${slide.mobile}');">
        <div class="slide-caption">
          <h2>${slide.title || ''}</h2>
        </div>
      </div>
    `).join('');

    // Event delegation for slide clicks
    container.addEventListener('click', (e) => {
      const slide = e.target.closest('[data-slide-link]');
      if (slide) {
        const link = slide.getAttribute('data-slide-link');
        if (link) window.open(link, '_blank', 'noopener,noreferrer');
      }
    });

    // Render dots
    if (dotsContainer) {
      dotsContainer.innerHTML = adminSlides.map((_, index) => `
        <span class="dot ${index === 0 ? 'active' : ''}" data-dot-index="${index}"></span>
      `).join('');
      
      // Event delegation for dot clicks
      dotsContainer.addEventListener('click', (e) => {
        const dot = e.target.closest('[data-dot-index]');
        if (dot) {
          const index = parseInt(dot.getAttribute('data-dot-index'), 10);
          goToSlide(index);
        }
      });
    }

    startAutoSlide();
  } catch (e) {
    console.error('Slider error:', e);
  }
}

/**
 * Show specific slide
 * @param {number} index - Slide index
 */
function showSlide(index) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.dot');
  if (slides.length === 0) return;

  if (index >= slides.length) currentSlideIndex = 0;
  else if (index < 0) currentSlideIndex = slides.length - 1;
  else currentSlideIndex = index;

  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));

  if (slides[currentSlideIndex]) slides[currentSlideIndex].classList.add('active');
  if (dots[currentSlideIndex]) dots[currentSlideIndex].classList.add('active');
}

/**
 * Navigate slides
 * @param {number} n - Direction (-1 or +1)
 */
function changeSlide(n) { 
  showSlide(currentSlideIndex + n); 
  resetTimer(); 
}

/**
 * Go to specific slide
 * @param {number} n - Slide index
 */
function goToSlide(n) { 
  showSlide(n); 
  resetTimer(); 
}

/**
 * Start auto-rotation timer
 */
function startAutoSlide() { 
  if (sliderTimer) clearInterval(sliderTimer);
  sliderTimer = setInterval(() => showSlide(currentSlideIndex + 1), CONFIG.SLIDER_ROTATION_INTERVAL); 
}

/**
 * Reset rotation timer
 */
function resetTimer() { 
  startAutoSlide(); 
}

// Expose for global access (needed by HTML buttons if any)
window.changeSlide = changeSlide;
window.goToSlide = goToSlide;

// ============ LOCATION FILTERS ============

/**
 * Populate state dropdown from JSON
 */
async function populateStateDropdown() {
  const stateSelect = document.getElementById('filter-state');
  if (!stateSelect) return;
  
  try {
    const response = await fetch(CONFIG.STATES_JSON_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const states = data.states || [];
    
    stateSelect.innerHTML = '<option value="">All States</option>';
    states.forEach(stateName => {
      stateSelect.innerHTML += `<option value="${stateName}">${stateName}</option>`;
    });
  } catch (err) {
    console.error('Error loading states:', err);
    stateSelect.innerHTML = '<option value="">Error loading states</option>';
  }
}

/**
 * Update district dropdown based on selected state
 */
async function updateDistrictDropdown() {
  const selectedState = document.getElementById('filter-state').value;
  const districtSelect = document.getElementById('filter-district');
  const areaSelect = document.getElementById('filter-area');
  
  if (!districtSelect) return;
  
  districtSelect.innerHTML = '<option value="">All Districts</option>';
  if (areaSelect) areaSelect.innerHTML = '<option value="">All Areas</option>';
  
  if (!selectedState) return;
  
  try {
    const response = await fetch(CONFIG.DISTRICTS_JSON_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const districts = data.districtsByState[selectedState] || [];
    
    districts.forEach(districtName => {
      districtSelect.innerHTML += `<option value="${districtName}">${districtName}</option>`;
    });
  } catch (err) {
    console.error('Error loading districts:', err);
    districtSelect.innerHTML = '<option value="">Error loading districts</option>';
  }
}

/**
 * Update area dropdown based on selected state and district
 */
async function updateAreaDropdown() {
  const selectedState = document.getElementById('filter-state').value;
  const selectedDistrict = document.getElementById('filter-district').value;
  const areaSelect = document.getElementById('filter-area');
  
  if (!areaSelect) return;
  
  areaSelect.innerHTML = '<option value="">All Areas</option>';
  
  if (!selectedState || !selectedDistrict) return;
  
  try {
    const stateName = selectedState.toLowerCase().replace(/\s+/g, '-');
    const url = `${CONFIG.AREAS_JSON_BASE}${stateName}.json`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const districtObj = data.districts.find(d => d.name === selectedDistrict);
    
    if (districtObj && districtObj.areas) {
      districtObj.areas.forEach(areaObj => {
        areaSelect.innerHTML += `<option value="${areaObj.name}">${areaObj.name}</option>`;
      });
    }
  } catch (err) {
    console.error('Error loading areas:', err);
    areaSelect.innerHTML = '<option value="">Error loading areas</option>';
  }
}

// ============ FILTERING ============

/**
 * Apply all filters to property list
 */
function applyFilters() {
  const listingType = document.getElementById('filter-listing-type')?.value || '';
  const state = document.getElementById('filter-state')?.value || '';
  const district = document.getElementById('filter-district')?.value || '';
  const area = document.getElementById('filter-area')?.value || '';
  const category = document.getElementById('filter-category')?.value || '';
  const minPrice = document.getElementById('filter-price-min')?.value || '';
  const maxPrice = document.getElementById('filter-price-max')?.value || '';

  // Show loading state
  const container = document.getElementById('listings-container');
  if (container) {
    container.innerHTML = '<p class="muted">Filtering...</p>';
  }

  // Use setTimeout to let UI update before heavy filtering
  setTimeout(() => {
    const filtered = allProperties.filter(p => {
      const price = parseFloat(p.priceRm);
      return (listingType === '' || p.listingType === listingType) &&
             (state === '' || p.state === state) &&
             (district === '' || p.district === district) &&
             (area === '' || p.area === area) &&
             (category === '' || p.category === category) &&
             (minPrice === '' || price >= parseFloat(minPrice)) &&
             (maxPrice === '' || price <= parseFloat(maxPrice));
    });
    
    renderCards(filtered);
  }, 0);
}

/**
 * Clear all filters and show all properties
 */
function clearFilters() {
  const filterIds = [
    'filter-listing-type', 'filter-state', 'filter-category', 
    'filter-price-min', 'filter-price-max'
  ];
  
  filterIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  const districtEl = document.getElementById('filter-district');
  const areaEl = document.getElementById('filter-area');
  
  if (districtEl) districtEl.innerHTML = '<option value="">All Districts</option>';
  if (areaEl) areaEl.innerHTML = '<option value="">All Areas</option>';
  
  renderCards(allProperties);
}

// Expose for global access (if needed by HTML)
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;

// ============ RENDERING ============

/**
 * Render property cards
 * @param {Array} properties - Array of property objects
 */
function renderCards(properties) {
  const container = document.getElementById('listings-container');
  const countDisplay = document.getElementById('property-count');
  if (!container) return;

  // Update count
  if (countDisplay) {
    countDisplay.innerText = `Showing ${properties.length} property listing${properties.length !== 1 ? 's' : ''}`;
  }
  
  if (properties.length === 0) {
    container.innerHTML = '<p class="muted">No matching properties found.</p>';
    return;
  }

  container.innerHTML = properties.map(item => `
    <div class="property-card">
      <img src="${item.photo1 || 'https://via.placeholder.com/300x200?text=No+Image'}" 
           alt="${item.adTitle || 'Property'}" 
           loading="lazy">
      <div class="card-content" style="padding:15px;">
        <h3>${item.adTitle || 'Untitled Property'}</h3>
        <p class="price">RM ${item.priceRm ? parseFloat(item.priceRm).toLocaleString() : 'N/A'}</p>
        <p class="location">${item.state || ''} ${item.district ? '> ' + item.district : ''}</p>
        <span class="badge">${item.category || 'Property'}</span>
      </div>
    </div>
  `).join('');
}

// ============ MODAL ============

const adModal = document.getElementById('adModal');
const openBtn = document.getElementById('openAdModalBtn');
const closeBtn = document.getElementById('closeAdModalBtn');

if (openBtn) {
  openBtn.onclick = () => { 
    if (adModal) adModal.classList.add('open'); 
  };
}

if (closeBtn) {
  closeBtn.onclick = () => { 
    if (adModal) adModal.classList.remove('open'); 
  };
}

// Close modal on escape key
if (adModal) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && adModal.classList.contains('open')) {
      adModal.classList.remove('open');
    }
  });
}

// ============ INITIALIZATION ============

/**
 * Initialize the page
 */
async function init() {
  // Load hero slider
  await loadAdminHeroSlider();

  // Load property listings
  try {
    const res = await fetch(CONFIG.PROJECTS_JSON_PATH, { cache: 'no-store' });

    if (!res.ok) {
      allProperties = [];
    } else {
      const raw = await res.json();
      // Accept both array and object format
      allProperties = Array.isArray(raw) ? raw : (raw.listings || []);
    }
  } catch (e) {
    console.error('Data load error:', e);
    allProperties = [];
  }

  // Render and setup
  renderCards(allProperties);
  await populateStateDropdown();
  await updateDistrictDropdown();
}

// ============ EVENT LISTENERS ============

document.addEventListener('DOMContentLoaded', () => {
  const stateFilter = document.getElementById('filter-state');
  const districtFilter = document.getElementById('filter-district');
  
  if (stateFilter) {
    stateFilter.addEventListener('change', updateDistrictDropdown);
  }
  
  if (districtFilter) {
    districtFilter.addEventListener('change', updateAreaDropdown);
  }
  
  // Start
  init();
});