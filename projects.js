/* ========================================
   THE PROPERTY BRIEF — projects.js
   - Final "Direct Click" Version
   - Fixes all Modal opening issues
   Updated: Feb 17 2026
======================================== */

// ============ STATE ============
let allProperties = [];
let currentSlideIndex = 0;
let sliderTimer = null;
let adminSlides = [];
let cardCarouselTimers = {};

// ============ LIFECYCLE ============

window.addEventListener('beforeunload', () => {
  if (sliderTimer) clearInterval(sliderTimer);
  Object.values(cardCarouselTimers).forEach(timer => clearInterval(timer));
});

document.addEventListener('DOMContentLoaded', () => {
  initDropdowns();
  init(); // Load data

  // Attach Form Submitter
  const form = document.querySelector('form[name="project-submit"]');
  if (form) form.addEventListener('submit', handleFormSubmit);
});

// ============ INITIALIZATION ============

async function init() {
  await loadAdminHeroSlider();
  await loadProperties();
}

async function loadProperties() {
  try {
    setLoadingState(true);
    console.log("Fetching properties from:", CONFIG.API.PROJECTS_JSON); // Debug Log

    const res = await fetch(CONFIG.API.PROJECTS_JSON, CONFIG.CACHE.DEFAULT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const raw = await res.json();
    allProperties = (Array.isArray(raw) ? raw : []).filter(p => p['Ad Title']);
    
    console.log(`Loaded ${allProperties.length} properties`); // Debug Log
    renderCards(allProperties);

  } catch (e) {
    console.error('Properties load error:', e);
    showError('listings-container', 'Could not load properties. Please refresh.');
  } finally {
    setLoadingState(false);
  }
}

// ============ RENDERING (THE FIX) ============

/**
 * Global function to handle clicks.
 * Referenced directly in the HTML onclick="" attribute.
 */
window.handleCardClick = function(index) {
  console.log("Card clicked! Index:", index); // Debug Log
  if (allProperties[index]) {
    openPropertyModal(allProperties[index]);
  } else {
    console.error("Error: Property data missing for index", index);
  }
};

function renderCards(properties) {
  const container = document.getElementById('listings-container');
  const count = document.getElementById('property-count');
  if (!container) return;

  // Cleanup old timers
  Object.values(cardCarouselTimers).forEach(t => clearInterval(t));
  cardCarouselTimers = {};

  if (count) count.innerText = `Showing ${properties.length} listing${properties.length !== 1 ? 's' : ''}`;

  if (properties.length === 0) {
    container.innerHTML = `<div style="padding:40px;text-align:center;"><p>No properties found.</p></div>`;
    return;
  }

  // DIRECT CLICK FIX: Added onclick="handleCardClick(${index})" to the main div
  container.innerHTML = properties.map((item, index) => {
    const photos = getPropertyPhotos(item);
    const cardId = `card-${index}`;
    const price = item['Price(RM)'] ? parseInt(String(item['Price(RM)']).replace(/,/g, '')).toLocaleString() : '0';
    const builtUp = item['Built Up (Sq.Ft.)'] ? parseInt(String(item['Built Up (Sq.Ft.)']).replace(/,/g, '')).toLocaleString() : '';
    const type = (item['Listing Type'] || 'Property').toLowerCase().replace(/\s+/g,'-');

    return `
    <div class="property-card" id="${cardId}" onclick="handleCardClick(${index})">
      <div class="card-image-container">
        <img src="${photos[0]}" alt="${item['Ad Title']}" class="card-carousel-img" loading="lazy">
        <div class="status-badge ${type}">${item['Listing Type']||'Property'}</div>
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

  // Start carousels
  properties.forEach((item, index) => initCardCarousel(`card-${index}`, getPropertyPhotos(item)));
}

// ============ PROPERTY MODAL (SAFE VERSION) ============

function openPropertyModal(property) {
  console.log("Opening modal for:", property['Ad Title']); // Debug Log
  
  const modal = document.getElementById('propertyModal');
  if (!modal) {
    console.error("Modal element #propertyModal NOT FOUND in HTML");
    return;
  }

  // Safe Helpers
  const safeText = (t) => (t ? String(t) : '');
  const formatPrice = (p) => p ? parseInt(String(p).replace(/,/g, '')).toLocaleString() : '0';

  // Data Extraction
  const photos = getPropertyPhotos(property);
  const title = safeText(property['Ad Title'] || 'Untitled');
  const price = formatPrice(property['Price(RM)']);
  const listingType = safeText(property['Listing Type'] || 'Property');
  const desc = property.Description ? String(property.Description).replace(/\n/g, '<br>') : 'No description.';
  
  const location = safeText(property['Location Full']) || `${safeText(property.State)}, ${safeText(property.District)}`;
  const builtUp = property['Built Up (Sq.Ft.)'] ? parseInt(String(property['Built Up (Sq.Ft.)']).replace(/,/g, '')).toLocaleString() : 'N/A';
  
  // Render
  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" id="closePropertyModal">✕</button>
      <div class="modal-header">
        <div class="modal-title-row">
          <div class="status-badge ${listingType.toLowerCase().replace(/\s+/g,'-')}">${listingType}</div>
          <h2>${title}</h2>
          <p class="modal-price">RM ${price}</p>
        </div>
      </div>

      <div class="modal-gallery">
        ${photos.map((p, i) => `<div class="modal-photo ${i===0?'active':''}" data-photo-index="${i}"><img src="${p}"></div>`).join('')}
        ${photos.length > 1 ? `<div class="gallery-nav"><button class="gallery-prev">‹</button><button class="gallery-next">›</button></div>` : ''}
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
            <div><strong>Type:</strong> ${safeText(property['Property Type'] || property.Category)}</div>
            <div><strong>Tenure:</strong> ${safeText(property.Tenure || 'N/A')}</div>
            <div><strong>Bedrooms:</strong> ${safeText(property.Bedrooms || 'N/A')}</div>
            <div><strong>Bathrooms:</strong> ${safeText(property.Bathrooms || 'N/A')}</div>
            <div><strong>Built Up:</strong> ${builtUp} sqft</div>
            <div><strong>Land Size:</strong> ${safeText(property['Land Size'] || 'N/A')}</div>
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

  // Show
  modal.classList.add('open');

  // Close Handlers
  const closeBtn = modal.querySelector('#closePropertyModal');
  if (closeBtn) closeBtn.onclick = () => modal.classList.remove('open');
  modal.onclick = (e) => { if (e.target.id === 'propertyModal') modal.classList.remove('open'); };

  // Gallery Handlers
  if (photos.length > 1) {
    let idx = 0;
    const update = () => {
      modal.querySelectorAll('.modal-photo').forEach((p, i) => p.classList.toggle('active', i === idx));
    };
    modal.querySelector('.gallery-prev').onclick = (e) => { e.stopPropagation(); idx = idx > 0 ? idx - 1 : photos.length - 1; update(); };
    modal.querySelector('.gallery-next').onclick = (e) => { e.stopPropagation(); idx = idx < photos.length - 1 ? idx + 1 : 0; update(); };
  }

  // Map
  setTimeout(() => {
    const lat = property.Latitude || property.latitude;
    const lng = property.Longitude || property.longitude;
    initProjectMap(location, lat, lng);
  }, 300);
}

// ============ UTILS & HELPERS ============

function setLoadingState(loading) {
  const container = document.getElementById('listings-container');
  if (container) {
    container.style.opacity = loading ? '0.5' : '1';
    container.style.pointerEvents = loading ? 'none' : 'auto';
  }
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div style="padding:40px;text-align:center;"><p>⚠️ ${msg}</p></div>`;
}

function getPropertyPhotos(item) {
  const photos = [];
  for (let i = 1; i <= 5; i++) {
    const p = item[`Photo ${i}`];
    if (p && p.trim()) photos.push(p);
  }
  return photos.length ? photos : ['https://via.placeholder.com/300x200?text=No+Image'];
}

function generateContactHTML(contact) {
  if (!contact || !contact.trim()) return '<p>Contact info not available</p>';
  const t = contact.trim();
  const clean = t.replace(/[\s\-\(\)]/g, '');
  if (t.includes('@')) return `<div class="contact-row"><p>${t}</p><a href="mailto:${t}" class="contact-btn email">✉️ Email</a></div>`;
  if (/[\d]{7,}/.test(clean)) {
    return `
      <div class="contact-row">
        <p>${t}</p>
        <div class="contact-buttons">
          <a href="https://wa.me/${clean}" target="_blank" class="contact-btn whatsapp">💬 WhatsApp</a>
          <a href="tel:${clean}" class="contact-btn call">📞 Call</a>
        </div>
      </div>`;
  }
  return `<p>${t}</p>`;
}

// ============ FORM & SLIDER & FILTERS ============
// (Kept standard logic for these)

async function handleFormSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const txt = btn.innerText;
  btn.disabled = true; btn.innerText = "Submitting...";

  try {
    const fd = new FormData(e.target);
    const photos = await Promise.all(['photo1','photo2','photo3','photo4','photo5'].map(k => {
      const f = fd.get(k);
      return (f && f.size > 0) ? fileToBase64(f) : Promise.resolve(null);
    }));

    const payload = {
      adTitle: fd.get('adTitle'),
      listingType: fd.get('listingType'),
      category: fd.get('category'),
      sellerType: fd.get('sellerType'),
      priceRm: fd.get('priceRm'),
      state: fd.get('state'),
      district: fd.get('district'),
      area: fd.get('area') === 'others' ? fd.get('areaCustom') : fd.get('area'),
      locationFull: fd.get('locationFull') || `${fd.get('state')}, ${fd.get('district')}`,
      latitude: fd.get('latitude'),
      longitude: fd.get('longitude'),
      propertyType: fd.get('propertyType'),
      tenure: fd.get('tenure'),
      landTitle: fd.get('landTitle'),
      bedrooms: fd.get('bedrooms'),
      bathrooms: fd.get('bathrooms'),
      builtUpSqft: fd.get('builtUpSqft'),
      landSize: fd.get('landSize'),
      parking: fd.get('parking'),
      storeyCount: fd.get('storeyCount'),
      description: fd.get('description'),
      contact: fd.get('contact'),
      photos: photos.filter(p => p !== null)
    };

    const res = await fetch(CONFIG.API.PROJECTS_JSON, { method: 'POST', body: JSON.stringify(payload) });
    const json = await res.json();
    if (json.result === 'success') window.location.href = '/projects-thank-you.html';
    else throw new Error(json.error);

  } catch (err) {
    alert('Error: ' + err.message);
    btn.disabled = false; btn.innerText = txt;
  }
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => res({ data: r.result.split(',')[1], type: file.type, name: file.name });
    r.onerror = rej;
  });
}

function initCardCarousel(id, photos) {
  if (photos.length <= 1) return;
  if (cardCarouselTimers[id]) clearInterval(cardCarouselTimers[id]);
  let i = 0;
  cardCarouselTimers[id] = setInterval(() => {
    i = (i + 1) % photos.length;
    const img = document.querySelector(`#${id} .card-carousel-img`);
    const dots = document.querySelectorAll(`#${id} .carousel-dot`);
    if (img) { img.style.opacity = '0'; setTimeout(() => { img.src = photos[i]; img.style.opacity = '1'; }, 200); }
    if (dots) dots.forEach((d, x) => d.classList.toggle('active', x === i));
  }, 3000);
}

// ============ DROPDOWNS & MAPS ============
function initDropdowns() {
  const s = document.getElementById('filter-state');
  const d = document.getElementById('filter-district');
  if (s) s.addEventListener('change', updateDistrictDropdown);
  if (d) d.addEventListener('change', updateAreaDropdown);
  populateStateDropdown();
}

async function populateStateDropdown() {
  const el = document.getElementById('filter-state');
  if (!el) return;
  try {
    const r = await fetch(CONFIG.API.STATES_JSON, CONFIG.CACHE.DEFAULT);
    const d = await r.json();
    el.innerHTML = '<option value="">All States</option>' + (d.states||[]).map(s=>`<option value="${s}">${s}</option>`).join('');
  } catch(e) { console.error(e); }
}

async function updateDistrictDropdown() {
  const s = document.getElementById('filter-state').value;
  const el = document.getElementById('filter-district');
  if (!el) return;
  el.innerHTML = '<option value="">All Districts</option>';
  if (!s) return;
  try {
    const r = await fetch(CONFIG.API.DISTRICTS_JSON, CONFIG.CACHE.DEFAULT);
    const d = await r.json();
    const list = d.districtsByState?.[s] || [];
    if (list.length) el.innerHTML += list.map(x=>`<option value="${x}">${x}</option>`).join('');
  } catch(e) { console.error(e); }
}

async function updateAreaDropdown() {
  const s = document.getElementById('filter-state').value;
  const d = document.getElementById('filter-district').value;
  const el = document.getElementById('filter-area');
  if (!el || !s || !d) return;
  try {
    const r = await fetch(`${CONFIG.API.AREAS_BASE_PATH}${s.toLowerCase().replace(/\s+/g,'-')}.json`, CONFIG.CACHE.DEFAULT);
    const json = await r.json();
    const obj = json.districts?.find(x => x.name === d);
    el.innerHTML = '<option value="">All Areas</option>';
    if (obj?.areas) el.innerHTML += obj.areas.map(a=>`<option value="${a.name}">${a.name}</option>`).join('');
  } catch(e) { console.error(e); }
}

function initProjectMap(loc, lat, lng) {
  const c = document.getElementById('project-map');
  if (!c || !window.google) return;
  let pos = { lat: 3.139, lng: 101.6869 };
  if (lat && lng) {
    pos = { lat: parseFloat(lat), lng: parseFloat(lng) };
    new google.maps.Marker({ position: pos, map: new google.maps.Map(c, {zoom:15, center:pos}), title: loc });
  } else {
    new google.maps.Geocoder().geocode({ address: loc + ', Malaysia' }, (r, s) => {
      if (s === 'OK' && r[0]) {
        const p = r[0].geometry.location;
        new google.maps.Marker({ position: p, map: new google.maps.Map(c, {zoom:15, center:p}), title: loc });
      } else {
        new google.maps.Marker({ position: pos, map: new google.maps.Map(c, {zoom:15, center:pos}), title: loc });
      }
    });
  }
}

// ============ ADMIN SLIDER ============
async function loadAdminHeroSlider() {
  const c = document.getElementById('admin-slider-container');
  if (!c) return;
  try {
    const r = await fetch(CONFIG.API.PROJECTS_HERO_JSON, CONFIG.CACHE.NO_STORE);
    if(!r.ok) return;
    const d = await r.json();
    adminSlides = d.slides || [];
    if(!adminSlides.length) return;
    c.innerHTML = adminSlides.map((s,i) => `
      <div class="hero-slide ${i===0?'active':''}" style="--img-d: url('${s.desktop}');--img-t: url('${s.tablet}');--img-m: url('${s.mobile}');">
        <div class="slide-caption"><h2>${s.title||''}</h2></div>
      </div>`).join('');
    startAutoSlide();
  } catch(e) { console.error(e); }
}

function showSlide(n) {
  const s = document.querySelectorAll('.hero-slide');
  if (!s.length) return;
  currentSlideIndex = (n >= s.length) ? 0 : (n < 0) ? s.length - 1 : n;
  s.forEach(el => el.classList.remove('active'));
  s[currentSlideIndex].classList.add('active');
}
function changeSlide(n) { showSlide(currentSlideIndex + n); resetTimer(); }
function startAutoSlide() { if(sliderTimer) clearInterval(sliderTimer); sliderTimer = setInterval(()=>showSlide(currentSlideIndex+1), CONFIG.SLIDER.AUTO_SLIDE_INTERVAL_MS); }
function resetTimer() { startAutoSlide(); }
window.changeSlide = changeSlide;

// ============ FILTERS ============
function applyFilters() {
  const t = document.getElementById('filter-listing-type')?.value;
  const s = document.getElementById('filter-state')?.value;
  const d = document.getElementById('filter-district')?.value;
  const a = document.getElementById('filter-area')?.value;
  const c = document.getElementById('filter-category')?.value;
  const min = document.getElementById('filter-price-min')?.value;
  const max = document.getElementById('filter-price-max')?.value;

  const f = allProperties.filter(p => {
    const price = parseFloat(p['Price(RM)']);
    return (!t || p['Listing Type']===t) && (!s || p.State===s) && (!d || p.District===d) && (!a || p.Area===a) && (!c || p.Category===c) && (!min || price >= min) && (!max || price <= max);
  });
  renderCards(f);
}
function clearFilters() {
  ['filter-listing-type','filter-state','filter-category','filter-price-min','filter-price-max'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  renderCards(allProperties);
}
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;

// ============ AD MODAL UTILS ============
const am = document.getElementById('adModal');
const op = document.getElementById('openAdModalBtn');
const cl = document.getElementById('closeAdModalBtn');
if (op) op.onclick = () => am?.classList.add('open');
if (cl) cl.onclick = () => am?.classList.remove('open');