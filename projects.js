// --- GLOBAL DATA ---
let allProperties = []; 

// --- 1. INITIALIZATION ENGINE ---
async function init() {
  try {
    // Correct path to the data folder we set up in Make.com
    const res = await fetch("data/projects.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not find data/projects.json");
    
    allProperties = await res.json();
    
    await loadProjectsHeroBackground(); // Load CMS Hero
    renderCards(allProperties);         // Show all houses
    populateStateDropdown();            // Set up search filters
  } catch (e) {
    console.log("Init error:", e);
  }
}

// --- 2. HERO & CMS LOGIC ---
async function loadProjectsHeroBackground() {
  const hero = document.getElementById("projectsHero");
  if (!hero) return;

  try {
    const res = await fetch("content/settings/projects-hero.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();

    if (data.heroDesktop) hero.style.setProperty("--hero-desktop", `url("${data.heroDesktop}")`);
    if (data.heroTablet) hero.style.setProperty("--hero-tablet", `url("${data.heroTablet}")`);
    if (data.heroMobile) hero.style.setProperty("--hero-mobile", `url("${data.heroMobile}")`);
  } catch (e) {
    console.log("Hero Load Error:", e);
  }
}

// --- 3. SEARCH & FILTER LOGIC ---
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
    districtSelect.innerHTML = '<option value="">All Districts</option>';
    
    const districts = [...new Set(allProperties
        .filter(p => p.state === selectedState || selectedState === "")
        .map(p => p.district))].filter(Boolean).sort();
    
    districts.forEach(d => districtSelect.innerHTML += `<option value="${d}">${d}</option>`);
    updateAreaDropdown(); 
}

function updateAreaDropdown() {
    const selectedDistrict = document.getElementById('filter-district').value;
    const areaSelect = document.getElementById('filter-area');
    areaSelect.innerHTML = '<option value="">All Areas</option>';

    const areas = [...new Set(allProperties
        .filter(p => p.district === selectedDistrict || selectedDistrict === "")
        .map(p => p.area))].filter(Boolean).sort();

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
    document.getElementById('filter-listing-type').value = "";
    document.getElementById('filter-state').value = "";
    document.getElementById('filter-district').innerHTML = '<option value="">All Districts</option>';
    document.getElementById('filter-area').innerHTML = '<option value="">All Areas</option>';
    document.getElementById('filter-category').value = "";
    document.getElementById('filter-price-max').value = "";
    renderCards(allProperties);
}

// --- 4. RENDER CARDS ---
function renderCards(properties) {
    const container = document.getElementById('listings-container');
    if (!container) return;
    
    if (properties.length === 0) {
        container.innerHTML = '<p>No matching property briefs found.</p>';
        return;
    }

    container.innerHTML = properties.map(item => `
        <div class="property-card">
            <img src="${item.photo1 || 'https://via.placeholder.com/300x200'}" alt="Property">
            <div class="card-content" style="padding:15px;">
                <h3>${item.adTitle}</h3>
                <p class="price" style="color:#27ae60; font-weight:bold;">RM ${item.priceRm}</p>
                <p class="location">${item.state} > ${item.district}</p>
                <span class="badge" style="background:#eee; padding:2px 8px; border-radius:10px; font-size:12px;">${item.category}</span>
            </div>
        </div>
    `).join('');
}

// --- 5. MODAL & AD FORM LOGIC (Your Original Code) ---
const adModal = document.getElementById("adModal");
const openAdModalBtn = document.getElementById("openAdModalBtn");
const closeAdModalBtn = document.getElementById("closeAdModalBtn");

function openAdModal() { if (adModal) { adModal.classList.add("open"); adModal.setAttribute("aria-hidden", "false"); } }
function closeAdModal() { if (adModal) { adModal.classList.remove("open"); adModal.setAttribute("aria-hidden", "true"); } }

if (openAdModalBtn) openAdModalBtn.addEventListener("click", openAdModal);
if (closeAdModalBtn) closeAdModalBtn.addEventListener("click", closeAdModal);

// START EVERYTHING
document.addEventListener('DOMContentLoaded', init);