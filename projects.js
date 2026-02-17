/* ========================================
   THE PROPERTY BRIEF — projects.js
   - Loads listings from Google Sheets
   - Submits new ads to Google Sheets (Base64)
   - Handles Map & UI
   - "Crash-Proof" Modal (Updated Feb 17 2026)
======================================== */

// ============ STATE ============
let allProperties = [];
let currentSlideIndex = 0;
let sliderTimer = null;
let adminSlides = [];
let isLoading = false;
let cardCarouselTimers = {};

// ============ LIFECYCLE ============

window.addEventListener('beforeunload', () => {
  if (sliderTimer) clearInterval(sliderTimer);
  Object.values(cardCarouselTimers).forEach(timer => clearInterval(timer));
});

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Helpers
  initDropdowns();
  
  // 2. Initialize Data
  init();

  // 3. Attach Custom Form Submitter
  const form = document.querySelector('form[name="project-submit"]');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
});

// ============ INITIALIZATION ============

async function init() {
  await loadAdminHeroSlider();
  await loadProperties();
}

/**
 * Load properties from Google Sheets Web App
 */
async function loadProperties() {
  try {
    setLoadingState(true);
    
    // Use CONFIG.CACHE.DEFAULT to allow the browser to negotiate caching with Google
    const res = await fetch(CONFIG.API.PROJECTS_JSON, CONFIG.CACHE.DEFAULT);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const raw = await res.json();
    // Google Script returns a flat array of objects. 
    // We filter for objects that actually have an 'Ad Title' to avoid empty rows.
    allProperties = (Array.isArray(raw) ? raw : [])
      .filter(p => p['Ad Title'] && p['Ad Title'] !== '');
    
    renderCards(allProperties);
  } catch (e) {
    console.error('Properties load error:', e);
    allProperties = [];
    showError('listings-container', 'Could not load properties. Please refresh the page.');
  } finally {
    setLoadingState(false);
  }
}

// ============ FORM SUBMISSION ============

/**
 * Handle the "Post Free Ad" form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault(); // Stop Netlify/HTML standard submit
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerText;
  
  // UI: Show loading
  submitBtn.disabled = true;
  submitBtn.innerText = "Submitting...";

  try {
    const formData = new FormData(form);
    
    // 1. Convert File Inputs to Base64
    const photoPromises = [];
    ['photo1', 'photo2', 'photo3', 'photo4', 'photo5'].forEach(fieldName => {
      const file = formData.get(fieldName);
      if (file && file.size > 0) {
        photoPromises.push(fileToBase64(file));
      }
    });

    const photosBase64 = await Promise.all(photoPromises);

    // 2. Construct Payload (Matching Google Script keys)
    const payload = {
      adTitle: formData.get('adTitle'),
      listingType: formData.get('listingType'),
      category: formData.get('category'),
      sellerType: formData.get('sellerType'),
      priceRm: formData.get('priceRm'),
      
      // Location
      state: formData.get('state'),
      district: formData.get('district'),
      area: formData.get('area') === 'others' ? formData.get('areaCustom') : formData.get('area'),
      locationFull: formData.get('locationFull') || `${formData.get('state')}, ${formData.get('district')}`,
      latitude: formData.get('latitude'),
      longitude: formData.get('longitude'),
      
      // Details
      propertyType: formData.get('propertyType'),
      tenure: formData.get('tenure'),
      landTitle: formData.get('landTitle'),
      bedrooms: formData.get('bedrooms'),
      bathrooms: formData.get('bathrooms'),
      builtUpSqft: formData.get('builtUpSqft'),
      landSize: formData.get('landSize'),
      parking: formData.get('parking'),
      storeyCount: formData.get('storeyCount'),
      description: formData.get('description'),
      contact: formData.get('contact'),
      
      // Photos Array
      photos: photosBase64
    };

    // 3. Send to Google Script
    const response = await fetch(CONFIG.API.PROJECTS_JSON, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    // 4. Success handling
    const result = await response.json();
    
    if (result.result === 'success') {
      window.location.href = '/projects-thank-you.html';
    } else {
      throw new Error(result.error || 'Unknown error');
    }

  } catch (err) {
    console.error('Submission Error:', err);
    alert('Error submitting form: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.innerText = originalBtnText;
  }
}

/**
 * Helper: Read file as Base64 object for Google Script
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      const base64Data = result.split(',')[1];
      resolve({
        data: base64Data,
        type: file.type,
        name: file.name
      });
    };
    reader.onerror = error => reject(error);
  });
}

// ============ ADMIN SLIDER ============

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

      dotsContainer.addEventListener('click', (e) => {
        const dot = e.target.closest('.dot');
        if (dot) goToSlide(parseInt(dot.getAttribute('data-dot-index'), 10));
      });
    }

    startAutoSlide();
  } catch (e) {
    console.error('Slider error:', e);
  }
}

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

function changeSlide(n) {
  showSlide(currentSlideIndex + n);
  resetTimer();
}

function goToSlide(n) {
  showSlide(n);
  resetTimer();
}

function startAutoSlide() {
  if (sliderTimer) clearInterval(sliderTimer);
  sliderTimer = setInterval(() => {
    showSlide(currentSlideIndex + 1);
  }, CONFIG.SLIDER.AUTO_SLIDE_INTERVAL_MS);
}

function resetTimer() {
  startAutoSlide();
}

window.changeSlide = changeSlide;
window.goToSlide = goToSlide;

// ============ LOCATION & DROPDOWNS ============

function initDropdowns() {
  const stateFilter = document.getElementById('filter-state');
  const districtFilter = document.getElementById('filter-district');

  if (stateFilter) stateFilter.addEventListener('change', updateDistrictDropdown);
  if (districtFilter) districtFilter.addEventListener('change', updateAreaDropdown);
  
  populateStateDropdown();
}

async function populateStateDropdown() {
  const stateSelect = document.getElementById('filter-state');
  if (!stateSelect) return;

  try {
    const response = await fetch(CONFIG.API.STATES_JSON, CONFIG.CACHE.DEFAULT);
    if (!response.ok) throw new Error('States not found');
    
    const data = await response.json();
    const states = data.states || [];

    stateSelect.innerHTML = '<option value="">All States</option>' +
      states.map(state => `<option value="${state}">${state}</option>`).join('');
  } catch (err) {
    console.error('Error loading states:', err);
  }
}

async function updateDistrictDropdown() {
  const selectedState = document.getElementById('filter-state').value;
  const districtSelect = document.getElementById('filter-district');
  const areaSelect = document.getElementById('filter-area');

  if (!districtSelect) return;

  districtSelect.innerHTML = '<option value="">All Districts</option>';
  if (areaSelect) areaSelect.innerHTML = '<option value="">All Areas</option>';

  if (!selectedState) return;

  try {
    const response = await fetch(CONFIG.API.DISTRICTS_JSON, CONFIG.CACHE.DEFAULT);
    const data = await response.json();
    const districts = data.districtsByState?.[selectedState] || [];

    if (districts.length > 0) {
      districtSelect.innerHTML = '<option value="">All Districts</option>' +
        districts.map(d => `<option value="${d}">${d}</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading districts:', err);
  }
}

async function updateAreaDropdown() {
  const selectedState = document.getElementById('filter-state').value;
  const selectedDistrict = document.getElementById('filter-district').value;
  const areaSelect = document.getElementById('filter-area');

  if (!areaSelect || !selectedState || !selectedDistrict) return;

  try {
    const stateName = selectedState.toLowerCase().replace(/\s+/g, '-');
    const response = await fetch(`${CONFIG.API.AREAS_BASE_PATH}${stateName}.json`, CONFIG.CACHE.DEFAULT);
    const data = await response.json();
    const districtObj = data.districts?.find(d => d.name === selectedDistrict);

    areaSelect.innerHTML = '<option value="">All Areas</option>';
    if (districtObj?.areas && districtObj.areas.length > 0) {
      areaSelect.innerHTML += districtObj.areas.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading areas:', err);
  }
}

// ============ FILTERS & RENDERING ============

function applyFilters() {
  const filters = {
    type: document.getElementById('filter-listing-type')?.value,
    state: document.getElementById('filter-state')?.value,
    district: document.getElementById('filter-district')?.value,
    area: document.getElementById('filter-area')?.value,
    category: document.getElementById('filter-category')?.value,
    min: document.getElementById('filter-price-min')?.value,
    max: document.getElementById('filter-price-max')?.value
  };

  setLoadingState(true);

  const filtered = allProperties.filter(p => {
    const price = parseFloat(p['Price(RM)']);
    return (
      (!filters.type || p['Listing Type'] === filters.type) &&
      (!filters.state || p.State === filters.state) &&
      (!filters.district || p.District === filters.district) &&
      (!filters.area || p.Area === filters.area) &&
      (!filters.category || p.Category === filters.category) &&
      (!filters.min || price >= parseFloat(filters.min)) &&
      (!filters.max || price <= parseFloat(filters.max))
    );
  });

  setTimeout(() => {
    renderCards(filtered);
    setLoadingState(false);
  }, 150);
}

function clearFilters() {
  ['filter-listing-type', 'filter-state', 'filter-category', 'filter-price-min', 'filter-price-max']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

  const d = document.getElementById('filter-district');
  const a = document.getElementById('filter-area');
  if (d) d.innerHTML = '<option value="">All Districts</option>';
  if (a) a.innerHTML = '<option value="">All Areas</option>';

  renderCards(allProperties);
}

window.applyFilters = applyFilters;
window.clearFilters = clearFilters;

function setLoadingState(loading) {
  isLoading = loading;
  const container = document.getElementById('listings-container');
  if (!container) return;
  container.style.opacity = loading ? '0.5' : '1';
  container.style.pointerEvents = loading ? 'none' : 'auto';
}

function showError(containerId, message) {
  const c = document.getElementById(containerId);
  if (c) c.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted);"><p>⚠️ ${message}</p></div>`;
}

function getPropertyPhotos(item) {
  const photos = [];
  // Check headers "Photo 1" through "Photo 5"
  for (let i = 1; i <= 5; i++) {
    const photo = item[`Photo ${i}`];
    if (photo && photo.trim() !== '') photos.push(photo);
  }
  return photos.length > 0 ? photos : ['https://via.placeholder.com/300x200?text=No+Image'];
}

function generateContactHTML(contact) {
  if (!contact || contact.trim() === '') return '<p>Contact info not available</p>';
  const trimmed = contact.trim();
  const phonePattern = /[\d\+\-\(\)\s]{7,}/;
  
  if (trimmed.includes('@')) {
    return `<div class="contact-row"><p>${trimmed}</p><a href="mailto:${trimmed}" class="contact-btn email">✉️ Email</a></div>`;
  } else if (phonePattern.test(trimmed)) {
    const clean = trimmed.replace(/[\s\-\(\)]/g, '');
    return `
      <div class="contact-row">
        <p>${trimmed}</p>
        <div class="contact-buttons">
          <a href="https://wa.me/${clean}" target="_blank" class="contact-btn whatsapp">💬 WhatsApp</a>
          <a href="tel:${clean}" class="contact-btn call">📞 Call</a>
        </div>
      </div>`;
  }
  return `<p>${trimmed}</p>`;
}

function initCardCarousel(cardId, photos) {
  if (photos.length <= 1) return;
  if (cardCarouselTimers[cardId]) clearInterval(cardCarouselTimers[cardId]);
  
  let currentIndex = 0;
  cardCarouselTimers[cardId] = setInterval(() => {
    currentIndex = (currentIndex + 1) % photos.length;
    const img = document.querySelector(`#${cardId} .card-carousel-img`);
    const dots = document.querySelectorAll(`#${cardId} .carousel-dot`);
    
    if (img) {
      img.style.opacity = '0';
      setTimeout(() => { img.src = photos[currentIndex]; img.style.opacity = '1'; }, 200);
    }
    if (dots) dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
  }, 3000);
}

function renderCards(properties) {
  const container = document.getElementById('listings-container');
  const count = document.getElementById('property-count');
  if (!container) return;

  Object.values(cardCarouselTimers).forEach(t => clearInterval(t));
  cardCarouselTimers = {};

  if (count) count.innerText = `Showing ${properties.length} property listing${properties.length === 1 ? '' : 's'}`;

  if (properties.length === 0) {
    container.innerHTML = `<div style="padding:40px;text-align:center;"><p>No properties found.</p></div>`;
    return;
  }

  container.innerHTML = properties.map((item, index) => {
    const photos = getPropertyPhotos(item);
    const cardId = `card-${index}`;
    // Google Sheets might return numbers as numbers, so we handle both
    const price = item['Price(RM)'] ? parseInt(item['Price(RM)']).toLocaleString() : '0';
    const builtUp = item['Built Up (Sq.Ft.)'] ? parseInt(item['Built Up (Sq.Ft.)']).toLocaleString() : '';

    return `
    <div class="property-card" id="${cardId}" data-property-index="${index}">
      <div class="card-image-container">
        <img src="${photos[0]}" alt="${item['Ad Title']}" class="card-carousel-img" loading="lazy">
        <div class="status-badge ${(item['Listing Type']||'').toLowerCase().replace(/\s+/g,'-')}">${item['Listing Type']||'Property'}</div>
        ${photos.length > 1 ? `<div class="carousel-dots">${photos.map((_, i) => `<span class="carousel-dot ${i===0?'active':''}"></span>`).join('')}</div>` : ''}
      </div>
      <div class="card-content">
        <h3>${item['Ad Title']}</h3>
        <div class="property-specs">
          ${item.Bedrooms ? `<span class="spec">🛏️ ${item.Bedrooms}</span>` : ''}
          ${item.Bathrooms ? `<span class="spec">🛁 ${item.Bathrooms}</span>` : ''}
          ${builtUp ? `<span class="spec">📐 ${builtUp} sqft</span>` : ''}
        </div>
        <p class="price">RM ${price}</p>
        <p class="location">📍 ${item['Location Full'] || item.State}</p>
        <span class="badge">${item.Category || 'Property'}</span>
      </div>
    </div>`;
  }).join('');

  properties.forEach((item, index) => initCardCarousel(`card-${index}`, getPropertyPhotos(item)));
  
  container.querySelectorAll('.property-card').forEach(card => {
    card.addEventListener('click', () => {
      openPropertyModal(properties[parseInt(card.getAttribute('data-property-index'))]);
    });
  });
}

// ============ PROPERTY MODAL (SAFE VERSION) ============

/**
 * Open property details modal (Safe Version)
 * Fixes "dead click" issues by handling missing data gracefully.
 */
function openPropertyModal(property) {
  const modal = document.getElementById('propertyModal');
  if (!modal) return;

  // --- 1. SAFE DATA EXTRACTION (Prevents Crashes) ---
  const safeText = (text) => (text ? String(text) : '');
  const formatPrice = (p) => p ? parseInt(String(p).replace(/,/g, '')).toLocaleString() : '0';

  // Get photos or fallback
  const photos = getPropertyPhotos(property);
  
  // Get text fields with fallbacks
  const title = safeText(property['Ad Title'] || 'Untitled Property');
  const price = formatPrice(property['Price(RM)']);
  const listingType = safeText(property['Listing Type'] || 'Property');
  const category = safeText(property.Category || 'Property');
  
  // Handle description safely (replace newlines with <br>)
  const desc = property.Description 
    ? String(property.Description).replace(/\n/g, '<br>') 
    : 'No description provided.';
  
  // Safe Location Logic
  const location = safeText(property['Location Full']) || 
                   `${safeText(property.State)}, ${safeText(property.District)}`;

  // Safe Specs Logic
  const builtUp = property['Built Up (Sq.Ft.)'] ? parseInt(property['Built Up (Sq.Ft.)']).toLocaleString() : 'N/A';
  const landSize = safeText(property['Land Size'] || 'N/A');
  const bedrooms = safeText(property.Bedrooms || 'N/A');
  const bathrooms = safeText(property.Bathrooms || 'N/A');
  const tenure = safeText(property.Tenure || 'N/A');
  const propType = safeText(property['Property Type'] || category);

  // --- 2. BUILD GALLERY HTML ---
  const galleryHTML = photos.map((p, i) => 
    `<div class="modal-photo ${i===0?'active':''}" data-photo-index="${i}"><img src="${p}"></div>`
  ).join('');
  
  const dotsHTML = photos.map((_, i) => 
    `<span class="gallery-dot ${i===0?'active':''}" data-dot="${i}"></span>`
  ).join('');

  // --- 3. RENDER MODAL CONTENT ---
  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" id="closePropertyModal">✕</button>
      
      <div class="modal-header">
        <div class="modal-title-row">
          <div class="status-badge ${listingType.toLowerCase().replace(/\s+/g,'-')}">
            ${listingType}
          </div>
          <h2>${title}</h2>
          <p class="modal-price">RM ${price}</p>
        </div>
      </div>

      <div class="modal-gallery">
        ${galleryHTML}
        ${photos.length > 1 ? `
          <div class="gallery-nav">
            <button class="gallery-prev">‹</button>
            <button class="gallery-next">›</button>
          </div>
          <div class="gallery-dots">${dotsHTML}</div>
        ` : ''}
      </div>

      <div class="modal-body">
        <div class="modal-section">
          <h3>📍 Location</h3>
          <p>${location}</p>
          <div id="project-map" style="width:100%;height:300px;border-radius:8px;margin-top:12px;background:#eee;"></div>
        </div>

        <div class="modal-section">
          <h3>🏠 Details</h3>
          <div class="details-grid">
            <div><strong>Type:</strong> ${propType}</div>
            <div><strong>Tenure:</strong> ${tenure}</div>
            <div><strong>Bedrooms:</strong> ${bedrooms}</div>
            <div><strong>Bathrooms:</strong> ${bathrooms}</div>
            <div><strong>Built Up:</strong> ${builtUp} sqft</div>
            <div><strong>Land Size:</strong> ${landSize}</div>
          </div>
        </div>

        <div class="modal-section">
          <h3>📝 Description</h3>
          <p>${desc}</p>
        </div>

        <div class="modal-section">
          <h3>📞 Contact</h3>
          ${generateContactHTML(property.Contact)}
        </div>
      </div>
    </div>`;

  // --- 4. SHOW MODAL ---
  modal.classList.add('open');

  // --- 5. INITIALIZE INTERACTIVE ELEMENTS ---
  
  // Close Button Logic
  const closeBtn = modal.querySelector('#closePropertyModal');
  if (closeBtn) closeBtn.onclick = () => modal.classList.remove('open');
  
  // Click Outside to Close
  modal.onclick = (e) => {
    if (e.target.id === 'propertyModal') modal.classList.remove('open');
  }

  // Gallery Navigation Logic
  if (photos.length > 1) {
    let currentPhotoIndex = 0;
    const showPhoto = (idx) => {
      modal.querySelectorAll('.modal-photo').forEach((p, i) => p.classList.toggle('active', i === idx));
      modal.querySelectorAll('.gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
      currentPhotoIndex = idx;
    };
    
    const prevBtn = modal.querySelector('.gallery-prev');
    const nextBtn = modal.querySelector('.gallery-next');

    if (prevBtn) prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPhoto(currentPhotoIndex > 0 ? currentPhotoIndex - 1 : photos.length - 1);
    });
    
    if (nextBtn) nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPhoto(currentPhotoIndex < photos.length - 1 ? currentPhotoIndex + 1 : 0);
    });
  }

  // Map Logic (Delayed to allow modal render)
  setTimeout(() => {
    const lat = property.Latitude || property.latitude;
    const lng = property.Longitude || property.longitude;
    initProjectMap(location, lat, lng);
  }, 300);
}

// ============ MAPS ============

function initProjectMap(location, latitude, longitude) {
  const container = document.getElementById('project-map');
  if (!container || !window.google) return;

  let pos = { lat: 3.1390, lng: 101.6869 }; // Default KL
  
  // If we have valid coordinates
  if (latitude && longitude) {
    pos = { lat: parseFloat(latitude), lng: parseFloat(longitude) };
    drawMap(container, pos, location);
  } else {
    // Geocode
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: location + ', Malaysia' }, (results, status) => {
      if (status === 'OK' && results[0]) {
        drawMap(container, results[0].geometry.location, location);
      } else {
        drawMap(container, pos, location); // Fallback
      }
    });
  }
}

function drawMap(container, pos, title) {
  const map = new google.maps.Map(container, { zoom: 15, center: pos });
  new google.maps.Marker({ position: pos, map: map, title: title });
}

// ============ AD MODAL UTILS ============

const adModal = document.getElementById('adModal');
const openBtn = document.getElementById('openAdModalBtn');
const closeBtn = document.getElementById('closeAdModalBtn');

if (openBtn) openBtn.onclick = () => adModal?.classList.add('open');
if (closeBtn) closeBtn.onclick = () => adModal?.classList.remove('open');