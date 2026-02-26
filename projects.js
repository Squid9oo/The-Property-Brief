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
let compareList = [];           // stores up to 3 property objects for comparison
let currentRenderedProperties = []; // tracks currently filtered/rendered properties

// ============ LIFECYCLE ============

window.addEventListener('beforeunload', () => {
  if (sliderTimer) clearInterval(sliderTimer);
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
  // Run both fetches at the same time — saves ~3s on cold start
  await Promise.all([loadAdminHeroSlider(), loadProperties()]);
}

/**
 * Load properties from Google Sheets Web App
 */
async function loadProperties() {
  try {
    setLoadingState(true);

    // Show cached listings immediately (same browser session = instant load)
    const cached = sessionStorage.getItem('tpb_listings');
    if (cached) {
      try {
        allProperties = JSON.parse(cached);
        renderCards(allProperties);
        setLoadingState(false); // Hide spinner — user sees data now
      } catch (_) {
        sessionStorage.removeItem('tpb_listings');
      }
    }

    // Always fetch fresh data (silently if cache already shown)
    const res = await fetch(CONFIG.API.PROJECTS_JSON, CONFIG.CACHE.DEFAULT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const raw = await res.json();
    const fresh = (Array.isArray(raw) ? raw : [])
      .filter(p => p['Ad Title'] && p['Ad Title'] !== '');

    sessionStorage.setItem('tpb_listings', JSON.stringify(fresh));
    allProperties = fresh;
    renderCards(allProperties);

  } catch (e) {
    console.error('Properties load error:', e);
    // Only show error if we have no cached data to fall back on
    if (!allProperties.length) {
      showError('listings-container', 'Could not load properties. Please refresh the page.');
    }
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

    // Helper — reads a field from the currently visible category block
    // Needed because bedrooms/bathrooms/etc exist in multiple category blocks
    const cat = formData.get('category') || '';
    const catBlockId =
      cat === 'High Rise Residential' ? 'fields-high-rise-residential' :
      cat === 'Landed Residential'    ? 'fields-landed-residential'    :
      cat === 'Commercial'            ? 'fields-commercial'            :
      cat === 'Land'                  ? 'fields-land'                  : null;
    const catBlock = catBlockId ? document.getElementById(catBlockId) : null;
    const fromCat  = (name) => catBlock?.querySelector(`[name="${name}"]`)?.value || '';

    // Helper — reads a field from the currently visible listing-type block
    const lt = formData.get('listingType') || '';
    const ltBlockId =
      lt === 'New Launch' ? 'block-new-launch' :
      lt === 'For Sale'   ? 'block-for-sale'   :
      lt === 'For Rent'   ? 'block-for-rent'   : null;
    const ltBlock = ltBlockId ? document.getElementById(ltBlockId) : null;
    const fromLt  = (name) => ltBlock?.querySelector(`[name="${name}"]`)?.value || '';

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
      
      // Details — read from visible category block to avoid duplicate field name confusion
      propertyType: formData.get('propertyType'),
      tenure:       formData.get('tenure'),
      landTitle:    fromCat('landTitle'),
      bedrooms:     fromCat('bedrooms'),
      bathrooms:    fromCat('bathrooms'),
      builtUpSqft:  fromCat('builtUpSqft'),
      landSize:     fromCat('landSize') || formData.get('landSize'),
      parking:      fromCat('parking'),
      storeyCount:  fromCat('storeyCount'),
      description:  formData.get('description'),
      contact:      formData.get('contact'),
      
      // Photos Array
      photos: photosBase64,

      // ── New Launch — read from visible NL block ─────────────
      developerName:       fromLt('developerName'),
      developerLicense:    fromLt('developerLicense'),
      advertisingPermit:   fromLt('advertisingPermit'),
      expectedCompletion:  formData.get('expectedCompletion'), // hidden field
      totalUnits:          fromLt('totalUnits'),
      priceToRm:           formData.get('priceToRm'),
      builtUpMin:          fromLt('builtUpMin'),
      builtUpMax:          fromLt('builtUpMax'),
      bedroomsMin:         fromLt('bedroomsMin'),
      bedroomsMax:         fromLt('bedroomsMax'),
      bumiDiscount:        fromLt('bumiDiscount'),

      // ── For Sale ────────────────────────────────────────────
      furnishing:          fromLt('furnishing'),
      renovationCondition: fromLt('renovationCondition'),
      occupancyStatus:     fromLt('occupancyStatus'),

      // ── For Rent ────────────────────────────────────────────
      availableFrom:       fromLt('availableFrom'),
      minTenancy:          fromLt('minTenancy'),
      petsAllowed:         fromLt('petsAllowed'),

      // ── All Residential — read from visible category block ──
      gatedGuarded:        fromCat('gatedGuarded'),
      maintenanceFee:      fromCat('maintenanceFee'),
      sinkingFund:         fromCat('sinkingFund'),
      facilitiesStandard:  formData.get('facilitiesStandard'), // hidden field
      facilitiesCustom:    fromCat('facilitiesCustom'),
      floorLevel:          fromCat('floorLevel'),

      // ── Landed ──────────────────────────────────────────────
      lotType:             fromCat('lotType'),

      // ── Commercial ──────────────────────────────────────────
      cornerLot:           fromCat('cornerLot'),
      loadingBay:          fromCat('loadingBay'),
      electricalSupply:    fromCat('electricalSupply'),
      currentZoning:       fromCat('currentZoning'),
      grossFloorArea:      fromCat('grossFloorArea'),

      // ── Land ────────────────────────────────────────────────
      landAreaValue:       fromCat('landAreaValue'),
      landAreaUnit:        fromCat('landAreaUnit'),
      roadFrontage:        fromCat('roadFrontage'),
      topography:          fromCat('topography'),
      approvedZoning:      fromCat('approvedZoning'),
      waterSupply:         fromCat('waterSupply'),
      electricSupply:      fromCat('electricSupply'),

      // ── Connectivity ────────────────────────────────────────
      nearestTransit:      formData.get('nearestTransit'),
      nearestHighway:      formData.get('nearestHighway'),
      nearestShoppingMall: formData.get('nearestShoppingMall'),
      nearestSchoolUni:    formData.get('nearestSchoolUni'),
      nearestHospital:     formData.get('nearestHospital')
    };

    // 3. Send to Google Script
    console.log('🔍 PAYLOAD CHECK:', JSON.stringify(payload, null, 2));
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
      desktop: ad.imageDesktop || '',
      tablet:  ad.imageTablet  || ad.imageDesktop || '',
      mobile:  ad.imageMobile  || ad.imageTablet  || ad.imageDesktop || '',
      link:    ad.adUrl,
      title:   ad.altText || '',
    }));

  if (adminSlides.length === 0) {
      container.innerHTML = `
        <a class="ad-cta-banner ad-cta-banner--hero" href="/advertise.html" target="_blank" rel="noopener">
          <span class="ad-cta-label">Advertisement</span>
          <span class="ad-cta-headline">Book This Hero Slot — Showcase your project to property buyers &amp; investors across Malaysia</span>
          <span class="ad-cta-btn">Book This Slot →</span>
        </a>`;
      return;
    }

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
// ============ COMPARE FEATURE ============

function toggleCompare(index) {
  const property = currentRenderedProperties[index];
  if (!property) return;

  // Already selected → deselect
  const existingIdx = compareList.findIndex(p =>
    (p.Token && p.Token === property.Token) || p['Ad Title'] === property['Ad Title']
  );
  if (existingIdx !== -1) {
    compareList.splice(existingIdx, 1);
    updateCompareUI();
    return;
  }

  // Max 3 reached
  if (compareList.length >= 3) {
    showToast('Maximum 3 properties — remove one first');
    return;
  }

  // Same Listing Type + Category lock
  if (compareList.length > 0) {
    const ref = compareList[0];
    const sameType = property['Listing Type'] === ref['Listing Type'];
    const sameCat  = property['Category'] === ref['Category'];
    if (!sameType || !sameCat) {
      showToast(`Can only compare: ${ref['Listing Type']} · ${ref['Category']}`);
      return;
    }
  }

  compareList.push(property);
  updateCompareUI();
}

function updateCompareUI() {
  updateCompareButtons();
  updateCompareTray();
}

function updateCompareButtons() {
  document.querySelectorAll('.property-card').forEach(card => {
    const btn = card.querySelector('.card-compare-btn');
    if (!btn) return;
    const propIdx  = parseInt(card.getAttribute('data-property-index'));
    const property = currentRenderedProperties[propIdx];
    if (!property) return;

    const isSelected = compareList.some(p =>
      (p.Token && p.Token === property.Token) || p['Ad Title'] === property['Ad Title']
    );
    const isLocked = compareList.length > 0 && !isSelected && (
      property['Listing Type'] !== compareList[0]['Listing Type'] ||
      property['Category']     !== compareList[0]['Category']
    );
    const isFull = compareList.length >= 3 && !isSelected;

    btn.classList.toggle('selected', isSelected);
    btn.classList.toggle('locked',   isLocked || isFull);
    btn.disabled    = (isLocked || isFull);
    btn.textContent = isSelected ? '✓ Added' : '⊕ Compare';
  });
}

function updateCompareTray() {
  const tray = document.getElementById('compare-tray');
  if (!tray) return;

  if (compareList.length === 0) {
    tray.classList.remove('visible');
    return;
  }

  tray.classList.add('visible');

  tray.querySelector('.compare-tray-slots').innerHTML = compareList.map((p, i) => `
    <div class="compare-slot">
      <span class="compare-slot-name">${p['Ad Title'] || 'Property'}</span>
      <button class="compare-slot-remove" onclick="removeFromCompare(${i})" aria-label="Remove">✕</button>
    </div>
  `).join('');

  const btn = tray.querySelector('.compare-now-btn');
  btn.disabled    = compareList.length < 2;
  btn.textContent = `Compare Now (${compareList.length})`;
}

function removeFromCompare(i) {
  compareList.splice(i, 1);
  updateCompareUI();
}

function clearCompare() {
  compareList = [];
  updateCompareUI();
}

function goToCompare() {
  if (compareList.length < 2) return;
  sessionStorage.setItem('tpb_compare', JSON.stringify(compareList));
  window.location.href = '/compare.html';
}

// Inject compare tray into page
(function injectCompareTray() {
  const tray = document.createElement('div');
  tray.id        = 'compare-tray';
  tray.className = 'compare-tray';
  tray.setAttribute('role', 'region');
  tray.setAttribute('aria-label', 'Property comparison tray');
  tray.innerHTML = `
    <div class="compare-tray-inner">
      <div class="compare-tray-label">Compare:</div>
      <div class="compare-tray-slots"></div>
      <div class="compare-tray-actions">
        <button class="compare-now-btn" onclick="goToCompare()" disabled>Compare Now (0)</button>
        <button class="compare-clear-btn" onclick="clearCompare()">Clear All</button>
      </div>
    </div>
  `;
  document.body.appendChild(tray);
})();

// Expose to global scope (used by onclick in HTML)
window.toggleCompare     = toggleCompare;
window.removeFromCompare = removeFromCompare;
window.clearCompare      = clearCompare;
window.goToCompare       = goToCompare;

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

// Format "YYYY-MM" → "Jun 2027" for display
function formatCompletion(val) {
  if (!val) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const str = String(val).trim();

  // Handle ISO timestamp from Google Sheets (e.g. "2029-03-31T16:00:00.000Z")
  // Google Sheets stores YYYY-MM as a Date — the last day of that month
  // So "2029-04" becomes "2029-03-31T..." → we read the month from the DATE, not the string
  if (str.includes('T') || str.length > 7) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      // Google Sheets saves end-of-month for the selected month
      // e.g. April 2029 stored as 2029-03-31 UTC → we add 1 day to get the correct month
      const adjusted = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      return months[adjusted.getUTCMonth()] + ' ' + adjusted.getUTCFullYear();
    }
  }

  // Handle clean YYYY-MM format (direct string, not yet converted by Sheets)
  const parts = str.split('-');
  if (parts.length === 2 && parts[0].length === 4) {
    const m = parseInt(parts[1]) - 1;
    return (months[m] || '') + ' ' + parts[0];
  }

  return str; // fallback — return as-is
}

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

// size: 600 for cards (220px tall), 1200 for modal gallery
function getPropertyPhotos(item, size = 600) {
  const photos = [];
  for (let i = 1; i <= 5; i++) {
    const photo = item[`Photo ${i}`];
    if (photo && photo.trim() !== '') {
      let url = photo.trim();
      // Append Google size suffix to Drive URLs (=s600 = max 600px wide)
      if (url.includes('lh3.googleusercontent.com') && !url.includes('=s')) {
        url = url + '=s' + size;
      }
      photos.push(url);
    }
  }
  return photos.length > 0 ? photos : ['https://via.placeholder.com/300x200?text=No+Image'];
}

function generateContactHTML(contact) {
  if (!contact) return '<p class="contact-info">Contact info not available</p>';
  const trimmed = String(contact).trim();
  if (trimmed === '') return '<p class="contact-info">Contact info not available</p>';

  // Email
  if (trimmed.includes('@')) {
    return `
      <div class="contact-row">
        <p class="contact-info">${trimmed}</p>
        <div class="contact-buttons">
          <a href="mailto:${trimmed}" class="contact-btn email">✉️ Email</a>
        </div>
      </div>`;
  }

  // Phone — accept anything with 6+ digits (covers short test numbers + real MY numbers)
  const digitCount = (trimmed.match(/\d/g) || []).length;
  if (digitCount >= 6) {
    // Strip formatting for links — keep + prefix if present
    const clean = trimmed.replace(/[\s\-\(\)]/g, '');
    // For WhatsApp: ensure country code — if starts with 0, swap to +60
    const waNumber = clean.startsWith('0') ? '60' + clean.substring(1) : clean.replace(/^\+/, '');
    return `
      <div class="contact-row">
        <p class="contact-info">${trimmed}</p>
        <div class="contact-buttons">
          <a href="https://wa.me/${waNumber}" target="_blank" rel="noopener" class="contact-btn whatsapp">💬 WhatsApp</a>
          <a href="tel:${clean}" class="contact-btn call">📞 Call</a>
        </div>
      </div>`;
  }

  // Fallback — plain text
  return `<p class="contact-info">${trimmed}</p>`;
}

// ============ SHARE FUNCTIONALITY ============

function slugifyForListing(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D''""]/g, '')
    .replace(/[\u2014\u2013\u2014\u2013]/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function generateListingURL(property) {
  const titlePart = slugifyForListing(property['Ad Title'] || 'listing');
  const areaPart  = slugifyForListing(property['Area'] || property['District'] || '');
  const ltPart    = slugifyForListing(property['Listing Type'] || '');
  const slug      = [titlePart, areaPart, ltPart]
    .filter(Boolean).join('-').replace(/-{2,}/g, '-') || 'listing';
  return `${window.location.origin}/listings/${slug}`;
}

async function shareProperty(property, index) {
  const url = generateListingURL(property);
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

// ── LAZY LOADERS ─────────────────────────────────────────────

function loadGoogleMaps() {
  return new Promise((resolve) => {
    if (window.google && window.google.maps) { resolve(); return; }
    if (document.getElementById('google-maps-script')) {
      window._mapsCallbacks = window._mapsCallbacks || [];
      window._mapsCallbacks.push(resolve);
      return;
    }
    window._googleMapsLoaded = () => {
      resolve();
      (window._mapsCallbacks || []).forEach(cb => cb());
      window._mapsCallbacks = [];
    };
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCtHBA74KW3ZS8WE8OKUr6tWy2MHFHxGw8&callback=_googleMapsLoaded';
    script.async = true;
    document.head.appendChild(script);
  });
}

function loadAuth0() {
  return new Promise((resolve) => {
    if (window.auth0 && window.Auth) { resolve(); return; }
    if (document.getElementById('auth0-script')) {
      window._auth0Callbacks = window._auth0Callbacks || [];
      window._auth0Callbacks.push(resolve);
      return;
    }
    const sdk = document.createElement('script');
    sdk.id = 'auth0-script';
    sdk.src = 'https://cdn.auth0.com/js/auth0-spa-js/2.5/auth0-spa-js.production.js';
    sdk.onload = () => {
      const authScript = document.createElement('script');
      authScript.src = '/auth.js';
      authScript.onload = () => {
        resolve();
        (window._auth0Callbacks || []).forEach(cb => cb());
        window._auth0Callbacks = [];
      };
      document.head.appendChild(authScript);
    };
    document.head.appendChild(sdk);
  });
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

function renderCards(properties) {
  currentRenderedProperties = properties;
  const container = document.getElementById('listings-container');
  const count = document.getElementById('property-count');
  if (!container) return;

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

    // PSF — calculated on the fly
    const psf = (item['Price(RM)'] && item['Built Up (Sq.Ft.)'] && parseInt(item['Built Up (Sq.Ft.)']) > 0)
      ? Math.round(parseInt(item['Price(RM)']) / parseInt(item['Built Up (Sq.Ft.)']))
      : null;

    // New Launch range display
    const isNL = item['Listing Type'] === 'New Launch';
    const bedsDisplay = isNL && item.bedroomsMin
      ? `${item.bedroomsMin}${item.bedroomsMax ? '–' + item.bedroomsMax : '+'} bd`
      : item.Bedrooms ? `${item.Bedrooms} bd` : '';
    const sqftDisplay = isNL && item.builtUpMin
      ? `${parseInt(item.builtUpMin).toLocaleString()}${item.builtUpMax ? '–' + parseInt(item.builtUpMax).toLocaleString() : '+'} sqft`
      : item['Built Up (Sq.Ft.)'] ? `${parseInt(item['Built Up (Sq.Ft.)']).toLocaleString()} sqft` : '';
    const priceDisplay = isNL && item.priceToRm
      ? `From RM ${parseInt(item['Price(RM)']).toLocaleString()}`
      : `RM ${price}`;

    return `
    <div class="property-card" id="${cardId}" data-property-index="${index}">
      <div class="card-image-container">
        <img src="${photos[0]}" alt="${item['Ad Title']}" class="card-carousel-img" loading="lazy">
        <div class="status-badge ${(item['Listing Type']||'').toLowerCase().replace(/\s+/g,'-')}">${item['Listing Type']||'Property'}</div>
        ${photos.length > 1 ? `<div class="carousel-dots">${photos.map((_, i) => `<span class="carousel-dot ${i===0?'active':''}"></span>`).join('')}</div>` : ''}
      </div>
      <div class="card-content">
        ${isNL && item.developerName ? `<p class="card-developer">${item.developerName}</p>` : ''}
        <h3>${item['Ad Title']}</h3>
        <div class="property-specs">
          ${bedsDisplay ? `<span class="spec">🛏️ ${bedsDisplay}</span>` : ''}
          ${item.Bathrooms ? `<span class="spec">🛁 ${item.Bathrooms}</span>` : ''}
          ${sqftDisplay ? `<span class="spec">📐 ${sqftDisplay}</span>` : ''}
          ${psf ? `<span class="spec">💰 RM${psf.toLocaleString()}/sqft</span>` : ''}
          ${item.gatedGuarded === 'Yes' ? `<span class="spec">🔒 G&G</span>` : ''}
        </div>
        <p class="price">${priceDisplay}</p>
        <p class="location">📍 ${item['Location Full'] || item.State}</p>
        <div class="card-footer-row">
          <span class="badge">${item.Category || 'Property'}</span>
          ${isNL && item.expectedCompletion ? `<span class="completion-badge">🏗️ Est. Completion: ${formatCompletion(item.expectedCompletion)}</span>` : ''}
          ${item.Tenure ? `<span class="tenure-badge">${item.Tenure}</span>` : ''}
        </div>
        <div class="card-meta-row">
          <button class="card-share-btn" onclick="event.stopPropagation(); shareProperty(allProperties[${index}], ${index})" aria-label="Share this listing">↗ Share</button>
          <button class="card-compare-btn" id="compare-btn-${index}" onclick="event.stopPropagation(); toggleCompare(${index})" aria-label="Add to comparison">⊕ Compare</button>
          ${item['View Count'] ? `<span class="card-view-count">👁 ${parseInt(item['View Count']).toLocaleString()} view${parseInt(item['View Count']) === 1 ? '' : 's'}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
  
  container.querySelectorAll('.property-card').forEach(card => {
    card.addEventListener('click', () => {
      openPropertyModal(properties[parseInt(card.getAttribute('data-property-index'))], parseInt(card.getAttribute('data-property-index')));
    });
  });
}

function openPropertyModal(property, index) {
  const modal = document.getElementById('propertyModal');
  if (!modal) return;

  const savedScrollY = window.scrollY;

  // Fire-and-forget view increment — does not block modal opening
  if (property.Token) {
    fetch(CONFIG.API.PROJECTS_JSON, {
      method: 'POST',
      body: JSON.stringify({ action: 'incrementView', token: property.Token })
    }).catch(() => {}); // silent fail — never block the UI
  }

  const photos = getPropertyPhotos(property, 1200);
  const galleryHTML = photos.map((p, i) => `<div class="modal-photo ${i===0?'active':''}" data-photo-index="${i}"><img src="${p}"></div>`).join('');
  const dotsHTML = photos.map((_, i) => `<span class="gallery-dot ${i===0?'active':''}" data-dot="${i}"></span>`).join('');
  
  const price = property['Price(RM)'] ? parseInt(property['Price(RM)']).toLocaleString() : '0';
  const builtUp = property['Built Up (Sq.Ft.)'] ? parseInt(property['Built Up (Sq.Ft.)']).toLocaleString() : 'N/A';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-close-bar">
        <div class="modal-action-bar">
          <button class="modal-share-btn" id="modalShareBtn">↗ Share</button>
          <button class="modal-close" id="closePropertyModal">✕</button>
        </div>
      </div>
      <div class="modal-inner-scroll">
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

        ${(property['Listing Type'] === 'New Launch' && (property.developerName || property.expectedCompletion)) ? `
        <div class="modal-section modal-section--highlight">
          <h3>🏗️ New Launch Info</h3>
          <div class="details-grid">
            ${property.developerName       ? `<div><strong>Developer:</strong> ${property.developerName}</div>` : ''}
            ${property.expectedCompletion  ? `<div><strong>Expected Completion:</strong> ${formatCompletion(property.expectedCompletion)}</div>` : ''}
            ${property.totalUnits          ? `<div><strong>Total Units:</strong> ${parseInt(property.totalUnits).toLocaleString()}</div>` : ''}
            ${property.bumiDiscount        ? `<div><strong>Bumi Discount:</strong> ${property.bumiDiscount}%</div>` : ''}
            ${property.developerLicense    ? `<div><strong>Developer License:</strong> ${property.developerLicense}</div>` : ''}
            ${property.advertisingPermit   ? `<div><strong>Advertising Permit:</strong> ${property.advertisingPermit}</div>` : ''}
          </div>
        </div>` : ''}

        <div class="modal-section">
          <h3>📍 Location</h3>
          <p>${property['Location Full'] || `${property.State}, ${property.District}`}</p>
          <div id="project-map" style="width:100%;height:300px;border-radius:8px;margin-top:12px;background:#eee;"></div>
        </div>

        <div class="modal-section">
          <h3>🏠 Property Details</h3>
          <div class="details-grid">
            <div><strong>Type:</strong> ${property['Property Type'] || property.Category}</div>
            <div><strong>Tenure:</strong> ${property.Tenure || '—'}</div>
            <div><strong>Land Title:</strong> ${property['Land Title'] || '—'}</div>
            ${property.Bedrooms            ? `<div><strong>Bedrooms:</strong> ${property.Bedrooms}</div>` : ''}
            ${property.bedroomsMin         ? `<div><strong>Bedrooms:</strong> ${property.bedroomsMin}${property.bedroomsMax ? '–'+property.bedroomsMax : '+'}</div>` : ''}
            ${property.Bathrooms           ? `<div><strong>Bathrooms:</strong> ${property.Bathrooms}</div>` : ''}
            ${property['Built Up (Sq.Ft.)']? `<div><strong>Built Up:</strong> ${parseInt(property['Built Up (Sq.Ft.)']).toLocaleString()} sqft</div>` : ''}
            ${property.builtUpMin          ? `<div><strong>Built Up:</strong> ${parseInt(property.builtUpMin).toLocaleString()}${property.builtUpMax ? '–'+parseInt(property.builtUpMax).toLocaleString() : '+'} sqft</div>` : ''}
            ${property['Land Size']        ? `<div><strong>Land Area:</strong> ${property['Land Size']} sqft</div>` : ''}
            ${property.landAreaValue       ? `<div><strong>Land Area:</strong> ${property.landAreaValue} ${property.landAreaUnit || ''}</div>` : ''}
            ${property.Parking             ? `<div><strong>Car Park:</strong> ${property.Parking} bay(s)</div>` : ''}
            ${property['Storey Count']     ? `<div><strong>Storeys:</strong> ${property['Storey Count']}</div>` : ''}
            ${property.floorLevel          ? `<div><strong>Floor Level:</strong> ${property.floorLevel}</div>` : ''}
            ${property.lotType             ? `<div><strong>Lot Type:</strong> ${property.lotType}</div>` : ''}
            ${property.gatedGuarded        ? `<div><strong>Gated & Guarded:</strong> ${property.gatedGuarded}</div>` : ''}
          </div>
        </div>

        ${(() => {
          const psfVal = (property['Price(RM)'] && property['Built Up (Sq.Ft.)'] && parseInt(property['Built Up (Sq.Ft.)']) > 0)
            ? Math.round(parseInt(property['Price(RM)']) / parseInt(property['Built Up (Sq.Ft.)']))
            : null;
          const hasFinance = psfVal || property.maintenanceFee || property.sinkingFund || property.bumiDiscount;
          if (!hasFinance) return '';
          return `
        <div class="modal-section">
          <h3>💰 Pricing & Costs</h3>
          <div class="details-grid">
            ${psfVal                        ? `<div><strong>Price Per Sqft:</strong> RM ${psfVal.toLocaleString()}/sqft</div>` : ''}
            ${property.priceToRm            ? `<div><strong>Price Range:</strong> RM ${parseInt(property['Price(RM)']).toLocaleString()} – RM ${parseInt(property.priceToRm).toLocaleString()}</div>` : ''}
            ${property.maintenanceFee       ? `<div><strong>Maintenance Fee:</strong> RM ${property.maintenanceFee} psf</div>` : ''}
            ${property.sinkingFund          ? `<div><strong>Sinking Fund:</strong> RM ${property.sinkingFund} psf</div>` : ''}
          </div>
        </div>`;
        })()}

        ${(property.furnishing || property.renovationCondition || property.occupancyStatus || property.availableFrom || property.minTenancy || property.petsAllowed) ? `
        <div class="modal-section">
          <h3>${property['Listing Type'] === 'For Rent' ? '🔑 Rental Details' : '🏠 Sale Details'}</h3>
          <div class="details-grid">
            ${property.furnishing           ? `<div><strong>Furnishing:</strong> ${property.furnishing}</div>` : ''}
            ${property.renovationCondition  ? `<div><strong>Condition:</strong> ${property.renovationCondition}</div>` : ''}
            ${property.occupancyStatus      ? `<div><strong>Occupancy:</strong> ${property.occupancyStatus}</div>` : ''}
            ${property.availableFrom        ? `<div><strong>Available From:</strong> ${property.availableFrom}</div>` : ''}
            ${property.minTenancy           ? `<div><strong>Min Tenancy:</strong> ${property.minTenancy}</div>` : ''}
            ${property.petsAllowed          ? `<div><strong>Pets Allowed:</strong> ${property.petsAllowed}</div>` : ''}
          </div>
        </div>` : ''}

        ${(property.cornerLot || property.loadingBay || property.electricalSupply || property.currentZoning || property.grossFloorArea) ? `
        <div class="modal-section">
          <h3>🏪 Commercial Details</h3>
          <div class="details-grid">
            ${property.cornerLot            ? `<div><strong>Corner Lot:</strong> ${property.cornerLot}</div>` : ''}
            ${property.loadingBay           ? `<div><strong>Loading Bay:</strong> ${property.loadingBay}</div>` : ''}
            ${property.electricalSupply     ? `<div><strong>Electrical Supply:</strong> ${property.electricalSupply}</div>` : ''}
            ${property.currentZoning        ? `<div><strong>Zoning:</strong> ${property.currentZoning}</div>` : ''}
            ${property.grossFloorArea       ? `<div><strong>GFA:</strong> ${parseInt(property.grossFloorArea).toLocaleString()} sqft</div>` : ''}
          </div>
        </div>` : ''}

        ${(property.topography || property.approvedZoning || property.roadFrontage || property.waterSupply || property.electricSupply) ? `
        <div class="modal-section">
          <h3>🌿 Land Details</h3>
          <div class="details-grid">
            ${property.topography           ? `<div><strong>Topography:</strong> ${property.topography}</div>` : ''}
            ${property.approvedZoning       ? `<div><strong>Approved Zoning:</strong> ${property.approvedZoning}</div>` : ''}
            ${property.roadFrontage         ? `<div><strong>Road Frontage:</strong> ${property.roadFrontage}m</div>` : ''}
            ${property.waterSupply          ? `<div><strong>Water Supply:</strong> ${property.waterSupply}</div>` : ''}
            ${property.electricSupply       ? `<div><strong>Electricity:</strong> ${property.electricSupply}</div>` : ''}
          </div>
        </div>` : ''}

        ${(property.nearestTransit || property.nearestHighway || property.nearestShoppingMall || property.nearestSchoolUni || property.nearestHospital) ? `
        <div class="modal-section">
          <h3>🚇 Nearby Amenities</h3>
          <div class="details-grid">
            ${property.nearestTransit       ? `<div><strong>MRT/LRT/BRT:</strong> ${property.nearestTransit}</div>` : ''}
            ${property.nearestHighway       ? `<div><strong>Highway:</strong> ${property.nearestHighway}</div>` : ''}
            ${property.nearestShoppingMall  ? `<div><strong>Shopping Mall:</strong> ${property.nearestShoppingMall}</div>` : ''}
            ${property.nearestSchoolUni     ? `<div><strong>School/University:</strong> ${property.nearestSchoolUni}</div>` : ''}
            ${property.nearestHospital      ? `<div><strong>Hospital/Clinic:</strong> ${property.nearestHospital}</div>` : ''}
          </div>
        </div>` : ''}

        ${(property.facilitiesStandard || property.facilitiesCustom) ? `
        <div class="modal-section">
          <h3>🏊 Facilities</h3>
          ${property.facilitiesStandard ? `
          <div class="facilities-tags">
            ${property.facilitiesStandard.split(',').map(f => `<span class="facility-tag">${f.trim()}</span>`).join('')}
          </div>` : ''}
          ${property.facilitiesCustom ? `
          <div class="facilities-tags" style="margin-top:8px;">
            ${property.facilitiesCustom.split('\n').filter(f => f.trim()).map(f => `<span class="facility-tag">${f.trim()}</span>`).join('')}
          </div>` : ''}
        </div>` : ''}

        <div class="modal-section">
          <h3>📝 Description</h3>
          <p>${(property.Description || '').replace(/\n/g, '<br>')}</p>
        </div>

        <div class="modal-section">
          <h3>📞 Contact</h3>
          ${generateContactHTML(property.Contact)}
        </div>
      </div>
      </div>
    </div>`;

  modal.classList.add('open');

  // Map — lazy load Maps SDK only when modal is opened
  loadGoogleMaps().then(() => {
    const lat = property['Location Full']?.lat || property.Latitude;
    initProjectMap(property['Location Full'], lat, property.Longitude);
  });

  // Gallery Logic
  let currentPhotoIndex = 0;
  const showPhoto = (idx) => {
    modal.querySelectorAll('.modal-photo').forEach((p, i) => p.classList.toggle('active', i === idx));
    modal.querySelectorAll('.gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    currentPhotoIndex = idx;
  };
  
  modal.querySelector('.gallery-prev')?.addEventListener('click', () => showPhoto(currentPhotoIndex > 0 ? currentPhotoIndex - 1 : photos.length - 1));
  modal.querySelector('.gallery-next')?.addEventListener('click', () => showPhoto(currentPhotoIndex < photos.length - 1 ? currentPhotoIndex + 1 : 0));
  
  // Share Button (now in close bar)
  const shareBtn = modal.querySelector('#modalShareBtn');
  if (shareBtn) shareBtn.onclick = () => shareProperty(property, index);

  // Close Button
  const closeBtn = modal.querySelector('#closePropertyModal');
  if (closeBtn) closeBtn.onclick = () => {
    modal.classList.remove('open');
    window.scrollTo({ top: savedScrollY, behavior: 'instant' });
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      window.scrollTo({ top: savedScrollY, behavior: 'instant' });
    }
  };
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
    await loadAuth0();
    if (window.Auth && typeof window.Auth.requireLogin === 'function') {
      const isLoggedIn = await window.Auth.requireLogin();
      if (isLoggedIn && adModal) {
        adModal.classList.add('open');
      }
    }
  };
}

if (closeBtn) closeBtn.onclick = () => adModal?.classList.remove('open');