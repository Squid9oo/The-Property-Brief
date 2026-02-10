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
   ✅ AUTO-ROTATING CAROUSEL for property cards
   ✅ RICH CARD DISPLAY with status badges and specs
   ✅ CLICKABLE MODAL with full property details
   Last updated: 2026-02-10
======================================== */

// Hamburger menu initialized by menu.js (loaded globally)
// CONFIG is loaded globally via script tag

// ============ STATE ============
let allProperties = [];
let currentSlideIndex = 0;
let sliderTimer = null;
let adminSlides = [];
let isLoading = false;

// Property card carousels
let cardCarouselTimers = {};

// ============ LIFECYCLE ============

// Cleanup slider on page unload (prevents memory leaks)
window.addEventListener('beforeunload', () => {
  if (sliderTimer) {
    clearInterval(sliderTimer);
    sliderTimer = null;
  }
  
  // Clear all card carousel timers
  Object.values(cardCarouselTimers).forEach(timer => clearInterval(timer));
  cardCarouselTimers = {};
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
    const price = parseFloat(p['Price(RM)']);
    return (
      (listingType === '' || p['Listing Type'] === listingType) &&
      (state === '' || p.State === state) &&
      (district === '' || p.District === district) &&
      (area === '' || p.Area === area) &&
      (category === '' || p.Category === category) &&
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
 * Get all photos for a property
 * @param {Object} item - Property object
 * @returns {Array} - Array of photo URLs
 */
function getPropertyPhotos(item) {
  const photos = [];
  for (let i = 1; i <= 5; i++) {
    const photo = item[`Photo ${i}`];
    if (photo && photo.trim() !== '') {
      photos.push(photo);
    }
  }
  return photos.length > 0 ? photos : ['https://via.placeholder.com/300x200?text=No+Image'];
}

/**
 * Initialize card carousel
 * @param {string} cardId - Card ID
 * @param {Array} photos - Array of photo URLs
 */
function initCardCarousel(cardId, photos) {
  if (photos.length <= 1) return; // No need for carousel with 1 or 0 photos
  
  let currentIndex = 0;
  
  // Clear existing timer if any
  if (cardCarouselTimers[cardId]) {
    clearInterval(cardCarouselTimers[cardId]);
  }
  
  cardCarouselTimers[cardId] = setInterval(() => {
    currentIndex = (currentIndex + 1) % photos.length;
    
    const img = document.querySelector(`#${cardId} .card-carousel-img`);
    const dots = document.querySelectorAll(`#${cardId} .carousel-dot`);
    
    if (img) {
      img.style.opacity = '0';
      setTimeout(() => {
        img.src = photos[currentIndex];
        img.style.opacity = '1';
      }, 200);
    }
    
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentIndex);
    });
  }, 3000); // 3 seconds
}

/**
 * Render property cards
 * @param {Array} properties - Properties array
 */
function renderCards(properties) {
  const container = document.getElementById('listings-container');
  const countDisplay = document.getElementById('property-count');
  if (!container) return;

  // Clear existing timers
  Object.values(cardCarouselTimers).forEach(timer => clearInterval(timer));
  cardCarouselTimers = {};

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

  container.innerHTML = properties.map((item, index) => {
    const photos = getPropertyPhotos(item);
    const cardId = `card-${index}`;
    const bedrooms = item.Bedrooms || item.Bedroom || '';
    const bathrooms = item.Bathrooms || item.Bathroom || '';
    const builtUp = item['Built Up (Sq.Ft.)'] || '';
    
    return `
    <div class="property-card" id="${cardId}" data-property-index="${index}">
      <div class="card-image-container">
        <img src="${photos[0]}" 
             alt="${item['Ad Title'] || 'Property'}" 
             class="card-carousel-img"
             loading="lazy">
        
        <!-- Status Badge -->
        <div class="status-badge ${(item['Listing Type'] || '').toLowerCase().replace(/\s+/g, '-')}">
          ${item['Listing Type'] || 'Property'}
        </div>
        
        <!-- Carousel Dots -->
        ${photos.length > 1 ? `
        <div class="carousel-dots">
          ${photos.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
        </div>
        ` : ''}
      </div>
      
      <div class="card-content">
        <h3>${item['Ad Title'] || 'Untitled'}</h3>
        
        <div class="property-specs">
          ${bedrooms ? `<span class="spec">🛏️ ${bedrooms} bed${bedrooms > 1 ? 's' : ''}</span>` : ''}
          ${bathrooms ? `<span class="spec">🛁 ${bathrooms} bath${bathrooms > 1 ? 's' : ''}</span>` : ''}
          ${builtUp ? `<span class="spec">📐 ${parseInt(builtUp).toLocaleString()} sqft</span>` : ''}
        </div>
        
        <p class="price">RM ${parseInt(item['Price(RM)'] || 0).toLocaleString()}</p>
        <p class="location">📍 ${item['Location Full'] || `${item.State || 'Unknown'}, ${item.District || 'Unknown'}`}</p>
        
        <span class="badge">${item.Category || 'Property'}</span>
      </div>
    </div>
  `;
  }).join('');

  // Initialize carousels for all cards
  properties.forEach((item, index) => {
    const photos = getPropertyPhotos(item);
    const cardId = `card-${index}`;
    initCardCarousel(cardId, photos);
  });

  // Add click event to open modal
  container.querySelectorAll('.property-card').forEach(card => {
    card.addEventListener('click', () => {
      const index = parseInt(card.getAttribute('data-property-index'));
      openPropertyModal(properties[index]);
    });
  });
}

// ============ PROPERTY MODAL ============

/**
 * Open property details modal
 * @param {Object} property - Property object
 */
function openPropertyModal(property) {
  const modal = document.getElementById('propertyModal');
  if (!modal) return;

  const photos = getPropertyPhotos(property);
  
  // Build photo gallery HTML
  const galleryHTML = photos.map((photo, i) => `
    <div class="modal-photo ${i === 0 ? 'active' : ''}" data-photo-index="${i}">
      <img src="${photo}" alt="Photo ${i + 1}" />
    </div>
  `).join('');

  const bedrooms = property.Bedrooms || property.Bedroom || 'N/A';
  const bathrooms = property.Bathrooms || property.Bathroom || 'N/A';
  const builtUp = property['Built Up (Sq.Ft.)'] ? `${parseInt(property['Built Up (Sq.Ft.)']).toLocaleString()} sqft` : 'N/A';
  const landSize = property['Land Size'] || 'N/A';
  const tenure = property.Tenure || 'N/A';
  const landTitle = property['Land Title'] || 'N/A';
  const propertyType = property['Property Type'] || property.Category || 'N/A';
  const parking = property.Parking || 'N/A';
  const storeyCount = property['Storey Count'] || 'N/A';

  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" id="closePropertyModal">✕</button>
      
      <div class="modal-header">
        <div class="status-badge ${(property['Listing Type'] || '').toLowerCase().replace(/\s+/g, '-')}">
          ${property['Listing Type'] || 'Property'}
        </div>
        <h2>${property['Ad Title'] || 'Property Details'}</h2>
        <p class="modal-price">RM ${parseInt(property['Price(RM)'] || 0).toLocaleString()}</p>
      </div>

      <div class="modal-gallery">
        ${galleryHTML}
        ${photos.length > 1 ? `
        <div class="gallery-nav">
          <button class="gallery-prev">‹</button>
          <button class="gallery-next">›</button>
        </div>
        <div class="gallery-dots">
          ${photos.map((_, i) => `<span class="gallery-dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></span>`).join('')}
        </div>
        ` : ''}
      </div>

      <div class="modal-body">
        <div class="modal-section">
          <h3>📍 Location</h3>
          <p>${property['Location Full'] || `${property.State || 'Unknown'}, ${property.District || 'Unknown'}`}</p>
        </div>

        <div class="modal-section">
          <h3>🏠 Property Details</h3>
          <div class="details-grid">
            <div><strong>Type:</strong> ${propertyType}</div>
            <div><strong>Category:</strong> ${property.Category || 'N/A'}</div>
            <div><strong>Bedrooms:</strong> ${bedrooms}</div>
            <div><strong>Bathrooms:</strong> ${bathrooms}</div>
            <div><strong>Built Up:</strong> ${builtUp}</div>
            <div><strong>Land Size:</strong> ${landSize}</div>
            <div><strong>Tenure:</strong> ${tenure}</div>
            <div><strong>Land Title:</strong> ${landTitle}</div>
            <div><strong>Parking:</strong> ${parking}</div>
            ${storeyCount !== 'N/A' ? `<div><strong>Storey:</strong> ${storeyCount}</div>` : ''}
          </div>
        </div>

        ${property.Description ? `
        <div class="modal-section">
          <h3>📝 Description</h3>
          <p>${property.Description}</p>
        </div>
        ` : ''}

        <div class="modal-section">
          <h3>📞 Contact</h3>
          <p class="contact-info">${property.Contact || 'Contact information not available'}</p>
        </div>

        ${property['Seller Type'] ? `
        <div class="modal-section">
          <p><strong>Seller Type:</strong> ${property['Seller Type']}</p>
        </div>
        ` : ''}
      </div>
    </div>
  `;

  modal.classList.add('open');

  // Gallery navigation
  let currentPhotoIndex = 0;
  const prevBtn = modal.querySelector('.gallery-prev');
  const nextBtn = modal.querySelector('.gallery-next');
  const dots = modal.querySelectorAll('.gallery-dot');

  function showPhoto(index) {
    const photos = modal.querySelectorAll('.modal-photo');
    const dots = modal.querySelectorAll('.gallery-dot');
    
    photos.forEach((p, i) => {
      p.classList.toggle('active', i === index);
    });
    
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === index);
    });
    
    currentPhotoIndex = index;
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newIndex = currentPhotoIndex > 0 ? currentPhotoIndex - 1 : photos.length - 1;
      showPhoto(newIndex);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newIndex = currentPhotoIndex < photos.length - 1 ? currentPhotoIndex + 1 : 0;
      showPhoto(newIndex);
    });
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      showPhoto(i);
    });
  });

  // Close modal
  const closeBtn = modal.querySelector('#closePropertyModal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
    });
  }

  // Close on escape
  const escapeHandler = (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      modal.classList.remove('open');
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);

  // Close when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'propertyModal') {
      modal.classList.remove('open');
    }
  });
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
