// --- 1. GLOBAL DATA ---
let allProperties = []; 
let currentSlideIndex = 0;
let sliderTimer;
let adminSlides = [];

// --- 2. INITIALIZATION ---
async function init() {
  // 1) Always try to load the hero slider (it has its own try/catch inside too)
  await loadAdminHeroSlider();

  // 2) Try to load listings data, but DON'T let the page break if missing
  try {
    const res = await fetch("data/projects.json", { cache: "no-store" });

    if (!res.ok) {
      allProperties = [];
    } else {
      const raw = await res.json();

      // Accept BOTH formats:
      // A) Array: [ {listingType, state, district, ...}, ... ]
      // B) Object: { listings: [ ... ] }
      allProperties = Array.isArray(raw) ? raw : (raw.listings || []);
    }
  } catch (e) {
    console.log("Data load error:", e);
    allProperties = [];
  }

  // 3) Render + setup filters
  renderCards(allProperties);
  populateStateDropdown();
  updateDistrictDropdown(); // ensures district/area dropdowns are in sync
}

// --- 3. ADMIN SLIDER LOGIC ---
async function loadAdminHeroSlider() {
    const container = document.getElementById('admin-slider-container');
    const dotsContainer = document.getElementById('slider-dots');
    if (!container) return;

    try {
        const res = await fetch("content/settings/projects-hero.json", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        adminSlides = data.slides || [];

        if (adminSlides.length === 0) return;

        container.innerHTML = adminSlides.map((slide, index) => `
            <div class="hero-slide ${index === 0 ? 'active' : ''}" 
                 style="--img-d: url('${slide.desktop}'); --img-t: url('${slide.tablet}'); --img-m: url('${slide.mobile}');"
                 onclick="if('${slide.link}') window.open('${slide.link}', '_blank')">
                <div class="slide-caption">
                    <h2>${slide.title || ''}</h2>
                </div>
            </div>
        `).join('');

        if (dotsContainer) {
            dotsContainer.innerHTML = adminSlides.map((_, index) => `
                <span class="dot ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></span>
            `).join('');
        }
        startAutoSlide();
    } catch (e) { console.log("Slider Error:", e); }
}

// --- 4. SLIDER CONTROLS ---
function showSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return;

    if (index >= slides.length) currentSlideIndex = 0;
    else if (index < 0) currentSlideIndex = slides.length - 1;
    else currentSlideIndex = index;

    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));

    if(slides[currentSlideIndex]) slides[currentSlideIndex].classList.add('active');
    if(dots[currentSlideIndex]) dots[currentSlideIndex].classList.add('active');
}

function changeSlide(n) { showSlide(currentSlideIndex + n); resetTimer(); }
function goToSlide(n) { showSlide(n); resetTimer(); }
function startAutoSlide() { 
    clearInterval(sliderTimer);
    sliderTimer = setInterval(() => showSlide(currentSlideIndex + 1), 5000); 
}
function resetTimer() { startAutoSlide(); }

// --- 5. SEARCH & FILTER LOGIC ---
function populateStateDropdown() {
    const stateSelect = document.getElementById('filter-state');
    if (!stateSelect) return;
    stateSelect.innerHTML = '<option value="">All States</option>';
    const states = [...new Set(allProperties.map(item => item.state))].filter(Boolean).sort();
    states.forEach(s => stateSelect.innerHTML += `<option value="${s}">${s}</option>`);
}

function updateDistrictDropdown() {
    const selectedState = document.getElementById('filter-state').value;
    const districtSelect = document.getElementById('filter-district');
    if (!districtSelect) return;
    districtSelect.innerHTML = '<option value="">All Districts</option>';
    const districts = [...new Set(allProperties.filter(p => p.state === selectedState || selectedState === "").map(p => p.district))].filter(Boolean).sort();
    districts.forEach(d => districtSelect.innerHTML += `<option value="${d}">${d}</option>`);
    updateAreaDropdown(); 
}

function updateAreaDropdown() {
    const selectedDistrict = document.getElementById('filter-district').value;
    const areaSelect = document.getElementById('filter-area');
    if (!areaSelect) return;
    areaSelect.innerHTML = '<option value="">All Areas</option>';
    const areas = [...new Set(allProperties.filter(p => p.district === selectedDistrict || selectedDistrict === "").map(p => p.area))].filter(Boolean).sort();
    areas.forEach(a => areaSelect.innerHTML += `<option value="${a}">${a}</option>`);
}

function applyFilters() {
    const listingType = document.getElementById('filter-listing-type').value;
    const state = document.getElementById('filter-state').value;
    const district = document.getElementById('filter-district').value;
    const area = document.getElementById('filter-area').value;
    const category = document.getElementById('filter-category').value;
    const maxPrice = document.getElementById('filter-price-max').value;

    const filtered = allProperties.filter(p => {
        return (listingType === "" || p.listingType === listingType) &&
               (state === "" || p.state === state) &&
               (district === "" || p.district === district) &&
               (area === "" || p.area === area) &&
               (category === "" || p.category === category) &&
               (maxPrice === "" || parseFloat(p.priceRm) <= parseFloat(maxPrice));
    });
    renderCards(filtered);
}

function clearFilters() {
    const ids = ['filter-listing-type', 'filter-state', 'filter-category', 'filter-price-max'];
    ids.forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ""; });
    if(document.getElementById('filter-district')) document.getElementById('filter-district').innerHTML = '<option value="">All Districts</option>';
    if(document.getElementById('filter-area')) document.getElementById('filter-area').innerHTML = '<option value="">All Areas</option>';
    renderCards(allProperties);
}

// --- 6. RENDER CARDS ---
function renderCards(properties) {
    const container = document.getElementById('listings-container');
    const countDisplay = document.getElementById('property-count');
    if (!container) return;

    // Update the count text
    if (countDisplay) {
        countDisplay.innerText = `Showing ${properties.length} property briefs`;
    }
    
    if (properties.length === 0) {
        container.innerHTML = '<p>No matching property found.</p>';
        return;
    }

    container.innerHTML = properties.map(item => `
        <div class="property-card">
            <img src="${item.photo1 || 'https://via.placeholder.com/300x200'}" alt="Property">
            <div class="card-content" style="padding:15px;">
                <h3>${item.adTitle}</h3>
                <p class="price">RM ${item.priceRm}</p>
                <p class="location">${item.state} > ${item.district}</p>
                <span class="badge">${item.category}</span>
            </div>
        </div>
    `).join('');
}

// --- 7. MODAL LOGIC ---
const adModal = document.getElementById("adModal");
const openBtn = document.getElementById("openAdModalBtn");
const closeBtn = document.getElementById("closeAdModalBtn");

if (openBtn) openBtn.onclick = () => { if(adModal) adModal.classList.add("open"); };
if (closeBtn) closeBtn.onclick = () => { if(adModal) adModal.classList.remove("open"); };

// Start the engine
document.addEventListener('DOMContentLoaded', init);