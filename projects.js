/* ========================================
   THE PROPERTY BRIEF — projects.js
   - Loads listings from Google Sheets
   - Submits new ads to Google Sheets (Base64)
   - Handles Map & UI
   Last updated: 2026-02-18
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

// ============ FORM SUBMISSION (NEW) ============

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
      email: formData.get('email'),
      editToken: formData.get('editToken'),
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
    const url = `${CONFIG.API.AD_BID_URL}?slotId=listing-hero`;
    const res = await fetch(url, CONFIG.CACHE.NO_STORE);
    if (!res.ok) return;

    const data = await res.json();
    const slotData = data['listing-hero'] || {};
    const ads = slotData.ads || [];

    // Map ad objects → slider slide format
    adminSlides = ads.map(ad => ({
      desktop: ad.imageUrl,
      tablet: ad.imageUrl, // you can later extend API to include tablet-specific images
      mobile: ad.imageUrl,
      link: ad.adUrl,
      title: ad.altText || '',
    }));

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
// ── TOKEN PRE-FILL (edit listing via ?token=) ─────────────────
async function checkEditToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token) return;

  try {
    const res = await fetch(CONFIG.API.PROJECTS_JSON + '?token=' + token);
    const data = await res.json();
    if (!data.found || !data.listing) return;

    const l = data.listing;

    // Store token in hidden field
    const tokenField = document.getElementById('editToken');
    if (tokenField) tokenField.value = token;

    // Pre-fill email
    const emailField = document.getElementById('submitterEmail');
    if (emailField && l['Email']) {
      emailField.value = l['Email'];
    }

    // Scroll to form and open it
    const formSection = document.getElementById('form-section-1');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Pre-fill Section 1 fields
    const setVal = (name, val) => {
      const el = document.querySelector(`[name="${name}"]`);
      if (el && val) el.value = val;
    };

    setVal('listingType', l['Listing Type']);
    setVal('category', l['Category']);
    setVal('sellerType', l['Seller Type']);

    // Show edit notice banner
    const form = document.querySelector('form[name="project-submit"]');
    if (form) {
      const banner = document.createElement('div');
      banner.style.cssText = 'background:rgba(245,200,0,0.12);border-left:3px solid #f5c800;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:1.5rem;font-size:0.9rem;';
      banner.innerHTML = '✏️ <strong>Editing your listing:</strong> ' + (l['Ad Title'] || '') + '<br><small style="opacity:0.7;">Resubmitting will reset your listing to Pending and restart the 30-day period upon re-approval.</small>';
      form.insertBefore(banner, form.firstChild);
    }

    // Change submit button label
    const submitBtn = document.getElementById('form-submit-btn');
    if (submitBtn) submitBtn.textContent = 'Resubmit Listing';

  } catch (err) {
    console.error('Edit token error:', err);
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', checkEditToken);

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
  for (let i = 1; i <= 5; i++) {
    const photo = item[`Photo ${i}`];
    if (photo && photo.trim() !== '') photos.push(photo);
  }
  return photos.length > 0 ? photos : ['https://via.placeholder.com/300x200?text=No+Image'];
}

function generateContactHTML(contact) {
  if (!contact) return '<p>Contact info not available</p>';
  const contactStr = String(contact);
  if (contactStr.trim() === '') return '<p>Contact info not available</p>';
  const trimmed = contactStr.trim();
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

// ============ SHARE FUNCTIONALITY ============

function generateListingSlug(title, index) {
  // Create URL-friendly slug from title
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  return `${slug}-${index}`;
}

function generateListingURL(property, index) {
  const slug = generateListingSlug(property['Ad Title'], index);
  return `${window.location.origin}/projects.html?listing=${slug}`;
}

async function shareProperty(property, index) {
  const url = generateListingURL(property, index);
  const title = property['Ad Title'];
  const text = `Check out this property: ${title} - RM ${parseInt(property['Price(RM)']).toLocaleString()}`;

  // Try Web Share API first (mobile + some desktop browsers)
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err) {
      // User cancelled or share failed
      if (err.name !== 'AbortError') {
        console.log('Share failed:', err);
      }
    }
  }

  // Fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(url);
    showToast('✓ Link copied to clipboard!');
  } catch (err) {
    // Final fallback: Show URL in prompt
    prompt('Copy this link:', url);
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.85);
    color: #fff;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 99999;
    animation: fadeInOut 2.5s ease-in-out;
  `;
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// Add CSS animation for toast
if (!document.getElementById('toast-styles')) {
  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = `
    @keyframes fadeInOut {
      0%, 100% { opacity: 0; transform: translateX(-50%) translateY(10px); }
      10%, 90% { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);
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
      openPropertyModal(properties[parseInt(card.getAttribute('data-property-index'))], parseInt(card.getAttribute('data-property-index')));
    });
  });
}

function openPropertyModal(property, index) {
  const modal = document.getElementById('propertyModal');
  if (!modal) return;

  const photos = getPropertyPhotos(property);
  const galleryHTML = photos.map((p, i) => `<div class="modal-photo ${i===0?'active':''}" data-photo-index="${i}"><img src="${p}"></div>`).join('');
  const dotsHTML = photos.map((_, i) => `<span class="gallery-dot ${i===0?'active':''}" data-dot="${i}"></span>`).join('');
  
  const price = property['Price(RM)'] ? parseInt(property['Price(RM)']).toLocaleString() : '0';
  const builtUp = property['Built Up (Sq.Ft.)'] ? parseInt(property['Built Up (Sq.Ft.)']).toLocaleString() : 'N/A';

  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" id="closePropertyModal">✕</button>
      <div class="modal-header">
        <div class="modal-title-row">
          <div class="status-badge ${(property['Listing Type']||'').toLowerCase().replace(/\s+/g,'-')}">${property['Listing Type']}</div>
          <h2>${property['Ad Title']}</h2>
          <p class="modal-price">RM ${price}</p>
        </div>
      </div>
      <div class="modal-gallery">
        ${galleryHTML}
        ${photos.length > 1 ? `<div class="gallery-nav"><button class="gallery-prev">‹</button><button class="gallery-next">›</button></div><div class="gallery-dots">${dotsHTML}</div>` : ''}
      </div>
      <div class="modal-body">
        <div class="modal-section">
          <h3>📍 Location</h3>
          <p>${property['Location Full'] || `${property.State}, ${property.District}`}</p>
          <div id="project-map" style="width:100%;height:300px;border-radius:8px;margin-top:12px;background:#eee;"></div>
        </div>
        <div class="modal-section">
          <h3>🏠 Details</h3>
          <div class="details-grid">
            <div><strong>Type:</strong> ${property['Property Type'] || property.Category}</div>
            <div><strong>Tenure:</strong> ${property.Tenure || 'N/A'}</div>
            <div><strong>Bedrooms:</strong> ${property.Bedrooms || 'N/A'}</div>
            <div><strong>Bathrooms:</strong> ${property.Bathrooms || 'N/A'}</div>
            <div><strong>Built Up:</strong> ${builtUp} sqft</div>
            <div><strong>Land Size:</strong> ${property['Land Size'] || 'N/A'}</div>
          </div>
        </div>
        <div class="modal-section">
          <h3>📝 Description</h3>
          <p>${(property.Description || '').replace(/\n/g, '<br>')}</p>
        </div>
        <div class="modal-section">
          <h3>📞 Contact</h3>
          ${generateContactHTML(property.Contact)}
        </div>
        <div class="modal-section" style="text-align: center; padding: 20px 0;">
          <button id="sharePropertyBtn" class="share-property-btn" style="
            background: linear-gradient(135deg, #f9d100 0%, #e6c200 100%);
            color: #000;
            border: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(249, 209, 0, 0.3);
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(249, 209, 0, 0.4)';" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 12px rgba(249, 209, 0, 0.3)';">
            <span style="font-size: 20px;">↗</span> Share Listing
          </button>
        </div>
      </div>
    </div>`;

  modal.classList.add('open');

  // Map
  setTimeout(() => {
    const lat = property['Location Full']?.lat || property.Latitude; 
    initProjectMap(property['Location Full'], lat, property.Longitude);
  }, 300);

  // Gallery Logic
  let currentPhotoIndex = 0;
  const showPhoto = (idx) => {
    modal.querySelectorAll('.modal-photo').forEach((p, i) => p.classList.toggle('active', i === idx));
    modal.querySelectorAll('.gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    currentPhotoIndex = idx;
  };
  
  modal.querySelector('.gallery-prev')?.addEventListener('click', () => showPhoto(currentPhotoIndex > 0 ? currentPhotoIndex - 1 : photos.length - 1));
  modal.querySelector('.gallery-next')?.addEventListener('click', () => showPhoto(currentPhotoIndex < photos.length - 1 ? currentPhotoIndex + 1 : 0));
  
  // Share Button
  const shareBtn = modal.querySelector('#sharePropertyBtn');
  if (shareBtn) {
    shareBtn.onclick = () => shareProperty(property, index);
  }
  
  // Close Button
  const closeBtn = modal.querySelector('#closePropertyModal');
  if (closeBtn) closeBtn.onclick = () => modal.classList.remove('open');
}

// ============ MAPS ============

function initProjectMap(location, latitude, longitude) {
  const container = document.getElementById('project-map');
  if (!container || !window.google) return;

  let pos = { lat: 3.1390, lng: 101.6869 };
  
  if (latitude && longitude) {
    pos = { lat: parseFloat(latitude), lng: parseFloat(longitude) };
    drawMap(container, pos, location);
  } else {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: location + ', Malaysia' }, (results, status) => {
      if (status === 'OK' && results[0]) {
        drawMap(container, results[0].geometry.location, location);
      } else {
        drawMap(container, pos, location);
      }
    });
  }
}

function drawMap(container, pos, title) {
  const map = new google.maps.Map(container, { zoom: 15, center: pos });
  new google.maps.Marker({ position: pos, map: map, title: title });
}

// ============ AD MODAL WITH AUTHENTICATION ============

const adModal = document.getElementById('adModal');
const openBtn = document.getElementById('openAdModalBtn');
const closeBtn = document.getElementById('closeAdModalBtn');

if (openBtn) {
  openBtn.onclick = async () => {
    if (window.Auth && typeof window.Auth.requireLogin === 'function') {
      const isLoggedIn = await window.Auth.requireLogin();
      if (isLoggedIn && adModal) {
        adModal.classList.add('open');
      }
    } else {
      console.warn('Auth not ready yet');
      setTimeout(() => openBtn.click(), 500);
    }
  };
}

if (closeBtn) closeBtn.onclick = () => adModal?.classList.remove('open');