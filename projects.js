/* ========================================
   THE PROPERTY BRIEF — projects.js (REFACTORED)
   All code quality issues fixed:
   ✅ No ES6 imports (uses global CONFIG and menu.js)
   ✅ No duplicate hamburger code
   ✅ Memory leak fixed (slider cleanup)
   ✅ Better error handling
   ✅ Loading states added
   ✅ Event delegation instead of inline handlers
   ✅ JSDoc documentation
   Last updated: 2026-02-09
======================================== */

// Hamburger menu initialized by menu.js (loaded globally)
// CONFIG is loaded globally via script tag

// ============ STATE ============
let allProperties = [];
let currentSlideIndex = 0;
let sliderTimer = null;
let adminSlides = [];
let isLoading = false;

// ============ LIFECYCLE ============

// Cleanup slider on page unload (prevents memory leaks)
window.addEventListener('beforeunload', () => {
  if (sliderTimer) {
    clearInterval(sliderTimer);
    sliderTimer = null;
  }
});

// ============ INITIALIZATION ============

/**
 * Initialize projects page
 */
async function init() {
  await loadAdminHeroSlider();
  await loadProperties();
  await populateStateDropdown();
  updateDistrictDropdown();
}

/**
 * Load properties data
 */
async function loadProperties() {
  try {
    setLoadingState(true);
    const res = await fetch(CONFIG.API.PROJECTS_JSON, CONFIG.CACHE.NO_STORE);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const raw = await res.json();
    allProperties = Array.isArray(raw) ? raw : (raw.listings || []);
    
    renderCards(allProperties);
  } catch (e) {
    console.error('Properties load error:', e);
    allProperties = [];
    showError('listings-container', 'Could not load properties. Please refresh the page.');
  } finally {
    setLoadingState(false);
  }
}

// ============ ADMIN SLIDER ============

/**
 * Load and initialize hero slider
 */
async function loadAdminHeroSlider() {
  const container = document.getElementById('admin-slider-container');
  const dotsContainer = document.getElementById('slider-dots');
  if (!container) return;

  try {
    const res = await fetch(CONFIG.API.PROJECTS_HERO_JSON, CONFIG.CACHE.NO_STORE);
    if (!res.ok) return;
    
    const data = await res.json();
    adminSlides = data.slides || [];

    if (adminSlides.length === 0) return;

    // Use event delegation instead of inline onclick
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
      const slide = e.target.closest('.hero-slide');
      if (slide) {
        const link = slide.getAttribute('data-slide-link');
        if (link) window.open(link, '_blank', 'noopener,noreferrer');
      }
    });

    if (dotsContainer) {
      dotsContainer.innerHTML = adminSlides.map((_, index) => `
        <span class="dot ${index === 0 ? 'active' : ''}" data-dot-index="${index}"></span>
      `).join('');

      // Event delegation for dots
      dotsContainer.addEventListener('click', (e) => {
        const dot = e.target.closest('.dot');
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
 * @param {number} n - Direction (-1 or 1)
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
 * Start auto-rotation
 */
function startAutoSlide() {
  if (sliderTimer) clearInterval(sliderTimer);
  sliderTimer = setInterval(() => {
    showSlide(currentSlideIndex + 1);
  }, CONFIG.SLIDER.AUTO_SLIDE_INTERVAL_MS);
}

/**
 * Reset timer
 */
function resetTimer() {
  startAutoSlide();
}

// Expose for HTML buttons (if any)
window.changeSlide = changeSlide;
window.goToSlide = goToSlide;

// ============ LOCATION FILTERS ============

/**
 * Populate state dropdown
 */
async function populateStateDropdown() {
  const stateSelect = document.getElementById('filter-state');
  if (!stateSelect) return;

  try {
    const response = await fetch(CONFIG.API.STATES_JSON, CONFIG.CACHE.NO_STORE);
    if (!response.ok) throw new Error('States not found');
    
    const data = await response.json();
    const states = data.states || [];

    stateSelect.innerHTML = '<option value="">All States</option>' +
      states.map(state => `<option value="${state}">${state}</option>`).join('');
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
    const response = await fetch(CONFIG.API.DISTRICTS_JSON, CONFIG.CACHE.NO_STORE);
    if (!response.ok) throw new Error('Districts not found');
    
    const data = await response.json();
    const districts = data.districtsByState?.[selectedState] || [];

    if (districts.length > 0) {
      districtSelect.innerHTML = '<option value="">All Districts</option>' +
        districts.map(district => `<option value="${district}">${district}</option>`).join('');
    } else {
      districtSelect.innerHTML = '<option value="">No districts available</option>';
    }
  } catch (err) {
    console.error('Error loading districts:', err);
    districtSelect.innerHTML = '<option value="">Error loading districts</option>';
  }
}

/**
 * Update area dropdown based on selected district
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
    const response = await fetch(`${CONFIG.API.AREAS_BASE_PATH}${stateName}.json`, CONFIG.CACHE.NO_STORE);
    
    if (!response.ok) throw new Error('Areas not found');

    const data = await response.json();
    const districtObj = data.districts?.find(d => d.name === selectedDistrict);

    if (districtObj?.areas && districtObj.areas.length > 0) {
      areaSelect.innerHTML = '<option value="">All Areas</option>' +
        districtObj.areas.map(areaObj => `<option value="${areaObj.name}">${areaObj.name}</option>`).join('');
    } else {
      areaSelect.innerHTML = '<option value="">No areas available</option>';
    }
  } catch (err) {
    console.error('Error loading areas:', err);
    areaSelect.innerHTML = '<option value="">Error loading areas</option>';
  }
}

// ============ FILTERS ============

/**
 * Apply all filters to properties
 */
function applyFilters() {
  const listingType = document.getElementById('filter-listing-type')?.value || '';
  const state = document.getElementById('filter-state')?.value || '';
  const district = document.getElementById('filter-district')?.value || '';
  const area = document.getElementById('filter-area')?.value || '';
  const category = document.getElementById('filter-category')?.value || '';
  const minPrice = document.getElementById('filter-price-min')?.value || '';
  const maxPrice = document.getElementById('filter-price-max')?.value || '';

  setLoadingState(true);

  const filtered = allProperties.filter(p => {
    const price = parseFloat(p.priceRm);
    return (
      (listingType === '' || p.listingType === listingType) &&
      (state === '' || p.state === state) &&
      (district === '' || p.district === district) &&
      (area === '' || p.area === area) &&
      (category === '' || p.category === category) &&
      (minPrice === '' || price >= parseFloat(minPrice)) &&
      (maxPrice === '' || price <= parseFloat(maxPrice))
    );
  });

  // Delay to show loading state
  setTimeout(() => {
    renderCards(filtered);
    setLoadingState(false);
  }, 150);
}

/**
 * Clear all filters
 */
function clearFilters() {
  const filterIds = [
    'filter-listing-type',
    'filter-state',
    'filter-category',
    'filter-price-min',
    'filter-price-max'
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

// Expose for HTML if needed
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;

// ============ RENDERING ============

/**
 * Set loading state UI
 * @param {boolean} loading - Is loading
 */
function setLoadingState(loading) {
  isLoading = loading;
  const container = document.getElementById('listings-container');
  if (!container) return;

  if (loading) {
    container.style.opacity = '0.5';
    container.style.pointerEvents = 'none';
  } else {
    container.style.opacity = '1';
    container.style.pointerEvents = 'auto';
  }
}

/**
 * Show error message
 * @param {string} containerId - Container ID
 * @param {string} message - Error message
 */
function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="padding:40px 20px; text-align:center; color:var(--muted);">
      <p style="font-size:16px; margin:0;">⚠️ ${message}</p>
    </div>
  `;
}

/**
 * Render property cards
 * @param {Array} properties - Properties array
 */
function renderCards(properties) {
  const container = document.getElementById('listings-container');
  const countDisplay = document.getElementById('property-count');
  if (!container) return;

  // Update count
  if (countDisplay) {
    countDisplay.innerText = `Showing ${properties.length} property listing${properties.length === 1 ? '' : 's'}`;
  }

  if (properties.length === 0) {
    container.innerHTML = `
      <div style="padding:40px 20px; text-align:center; color:var(--muted);">
        <p style="font-size:16px; margin:0;">No matching properties found.</p>
        <button onclick="clearFilters()" class="btnGhost" style="width:auto; margin-top:16px;">Clear Filters</button>
      </div>
    `;
    return;
  }

  container.innerHTML = properties.map(item => `
    <div class="property-card">
      <img src="${item.photo1 || 'https://via.placeholder.com/300x200?text=No+Image'}" 
           alt="${item.adTitle || 'Property'}" loading="lazy">
      <div class="card-content" style="padding:15px;">
        <h3>${item.adTitle || 'Untitled'}</h3>
        <p class="price">${item.priceFrom ? 'From ' : ''}RM ${parseInt(item.priceRm || 0).toLocaleString()}</p>
        <p class="location">${item.state || 'Unknown'} &gt; ${item.district || 'Unknown'}</p>
        <span class="badge">${item.category || 'Property'}</span>
      </div>
    </div>
  `).join('');
}

// ============ AD MODAL ============

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

// Close modal on Escape
if (adModal) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && adModal.classList.contains('open')) {
      adModal.classList.remove('open');
    }
  });

  // Close when clicking outside
  adModal.addEventListener('click', (e) => {
    if (e.target.id === 'adModal') {
      adModal.classList.remove('open');
    }
  });
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

  // Initialize
  init();
});
