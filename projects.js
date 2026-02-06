const shareBtn = document.getElementById("sharePageBtn");
if (shareBtn) {
  shareBtn.addEventListener("click", async () => {
    const url = location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("Link copied!");
      }
    } catch (e) {}
  });
}

const adModal = document.getElementById("adModal");
const openAdModalBtn = document.getElementById("openAdModalBtn");
const closeAdModalBtn = document.getElementById("closeAdModalBtn");

function openAdModal() {
  if (!adModal) return;
  adModal.classList.add("open");
  adModal.setAttribute("aria-hidden", "false");
}

function closeAdModal() {
  if (!adModal) return;
  adModal.classList.remove("open");
  adModal.setAttribute("aria-hidden", "true");
}

if (openAdModalBtn) {
  openAdModalBtn.addEventListener("click", async () => {
    if (window.Auth) {
      const ok = await window.Auth.requireLogin();
      if (!ok) return; // user is being redirected to login
    }
    openAdModal();
  });
}

// After Auth0 redirects back, auth.js will fire this event to open the modal
window.addEventListener("open-post-ad", () => openAdModal());

if (closeAdModalBtn) closeAdModalBtn.addEventListener("click", closeAdModal);

if (adModal) {
  adModal.addEventListener("click", (e) => {
    if (e.target === adModal) closeAdModal(); // click outside card closes
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && adModal.classList.contains("open")) closeAdModal();
  });
}

let allProjects = [];

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
});

function money(n) {
  if (typeof n !== "number") return "";
  return "RM " + n.toLocaleString("en-MY");
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function getPriceMinMax() {
  const range = getVal("filter-price"); // new dropdown
  if (range && range.includes("-")) {
    const [a, b] = range.split("-").map(Number);
    return { min: Number.isFinite(a) ? a : 0, max: Number.isFinite(b) ? b : Infinity };
  }
  return { min: 0, max: Infinity };
}

function matchesFilters(p) {
  const loc = getVal("filter-location");
  const type = getVal("filter-type");
  const tenure = getVal("filter-tenure");
  const sale = getVal("filter-sale");
  const q = getVal("filter-q").toLowerCase();

  const { min, max } = getPriceMinMax();

  const hay = `${p.name} ${p.location} ${p.state} ${p.developer || ""}`.toLowerCase();

  if (loc && !(p.country === loc || p.state === loc || p.location === loc)) return false;
  if (type && p.type !== type) return false;
  if (tenure && (p.tenure || "") !== tenure) return false;
  if (sale && (p.saleType || "") !== sale) return false;

  if (typeof p.priceFrom === "number") {
    if (p.priceFrom < min) return false;
    if (p.priceFrom > max) return false;
  }

  if (q && !hay.includes(q)) return false;

  return true;
}

function render(list) {
  const grid = document.getElementById("projects-grid");
  const count = document.getElementById("projects-count");

  count.textContent = `${list.length} project(s) found.`;
  grid.innerHTML = list.map(p => `
    <article class="card">
      <div class="card-image">
        <img src="${p.image || ""}" alt="${p.name}" loading="lazy" />
      </div>
      <div class="card-body">
        <div class="card-price">${money(p.priceFrom)}</div>
        <h3 class="card-title">${p.name}</h3>
        <div class="card-sub">${p.location}, ${p.state}</div>
        <div class="card-meta">
          ${p.sizeSqft ? `${p.sizeSqft} sqft` : ""}
          ${p.beds ? ` • ${p.beds} bed` : ""}
          ${p.baths ? ` • ${p.baths} bath` : ""}
          ${p.tenure ? ` • ${p.tenure}` : ""}
        </div>
      </div>
    </article>
  `).join("");
}

function apply() {
  render(allProjects.filter(matchesFilters));
}

async function loadProjectsHeroBackground() {
  const hero = document.getElementById("projectsHero");
  if (!hero) return;

  try {
    // Correct path to your CMS settings file
    const res = await fetch("content/settings/projects-hero.json", { cache: "no-store" });
    if (!res.ok) {
        console.log("CMS Settings file not found");
        return;
    }

    const data = await res.json();

    // Injects the images into your CSS variables
    if (data.heroDesktop) hero.style.setProperty("--hero-desktop", `url("${data.heroDesktop}")`);
    if (data.heroTablet) hero.style.setProperty("--hero-tablet", `url("${data.heroTablet}")`);
    if (data.heroMobile) hero.style.setProperty("--hero-mobile", `url("${data.heroMobile}")`);
  } catch (e) {
      console.log("Hero load error:", e);
  }
}

async function init() {
  try {
    // UPDATED PATH: Pointing to the 'data' folder we created in Phase 2
    const res = await fetch("data/projects.json", { cache: "no-store" });
    allProperties = await res.json(); // Use 'allProperties' to match your filter code
    
    await loadProjectsHeroBackground();
    
    // Initial render of all cards
    renderCards(allProperties); 
    
    // Populate the state dropdown
    const stateSelect = document.getElementById('filter-state');
    if (stateSelect) {
        const states = [...new Set(allProperties.map(item => item.state))].sort();
        states.forEach(state => {
            if(state) stateSelect.innerHTML += `<option value="${state}">${state}</option>`;
        });
    }
  } catch (e) {
    console.log("Init error:", e);
  }
}

// Make sure this is at the bottom to start the engine
document.addEventListener('DOMContentLoaded', init);

document.getElementById("btn-search").addEventListener("click", apply);document.getElementById("btn-reset").addEventListener("click", () => {
  ["filter-location","filter-type","filter-q","filter-price","filter-tenure","filter-sale"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  apply();
});

if (window.Auth) window.Auth.initAuth();

function initCategoryFields() {
  const categorySelect = document.getElementById("category");
  if (!categorySelect) return;

  const apartmentFields = document.getElementById("fields-apartment");
  const houseFields = document.getElementById("fields-house");
  const commercialFields = document.getElementById("fields-commercial");
  const landFields = document.getElementById("fields-land");

  function hideAllCategoryFields() {
    if (apartmentFields) apartmentFields.style.display = "none";
    if (houseFields) houseFields.style.display = "none";
    if (commercialFields) commercialFields.style.display = "none";
    if (landFields) landFields.style.display = "none";
  }

  categorySelect.addEventListener("change", () => {
    const category = categorySelect.value;
    hideAllCategoryFields();

    // Show the correct category-specific fields
    if (category === "Apartment" && apartmentFields) {
      apartmentFields.style.display = "block";
    } else if (category === "House" && houseFields) {
      houseFields.style.display = "block";
    } else if (category === "Commercial" && commercialFields) {
      commercialFields.style.display = "block";
    } else if (category === "Land" && landFields) {
      landFields.style.display = "block";
    }
  });
}

// Call it
initCategoryFields();

function initFormSections() {
  const section1 = document.getElementById("form-section-1");
  const section2 = document.getElementById("form-section-2");
  const nextBtn = document.getElementById("form-next-btn");
  const backBtn = document.getElementById("form-back-btn");

  const listingType = document.getElementById("listingType");
  const category = document.getElementById("category");
  const sellerType = document.getElementById("sellerType");

  if (!section1 || !section2 || !nextBtn || !backBtn) return;

  nextBtn.addEventListener("click", () => {
    // Validate Section 1 fields
    if (!listingType.value || !category.value || !sellerType.value) {
      alert("Please complete all fields in Section 1");
      return;
    }

    // Hide Section 1, show Section 2
    section1.style.display = "none";
    section2.style.display = "block";
  });

  backBtn.addEventListener("click", () => {
    // Show Section 1, hide Section 2
    section1.style.display = "block";
    section2.style.display = "none";
  });
}

// Call it
initFormSections();

async function initAdLocations() {
  const stateEl = document.getElementById("ad-state");
  const districtEl = document.getElementById("ad-district");
  const areaEl = document.getElementById("ad-area");
  const fullEl = document.getElementById("ad-locationFull");

  if (!stateEl || !districtEl || !areaEl || !fullEl) return;

    // Load districts first (this controls what states we show)
  const distRes = await fetch("content/settings/locations/districts.json", { cache: "no-store" });
  const distData = await distRes.json();
  const districtsByState = distData.districtsByState || {};

  // Load states (optional, but we keep it for future use)
  const statesRes = await fetch("content/settings/locations/states.json", { cache: "no-store" });
  const statesData = await statesRes.json();

  // Show only states that have districts configured
  const availableStates = Object.keys(districtsByState);

  stateEl.innerHTML =
    `<option value="">Select state</option>` +
    availableStates.map(s => `<option value="${s}">${s}</option>`).join("");

  async function loadAreasFileForState(stateName) {
    // For now we only have Selangor file; later we add more files
  const key = String(stateName || "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "-");
  const res = await fetch(`content/settings/locations/areas/${key}.json`, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.json();
  }

  function resetSelect(el, placeholder) {
    el.innerHTML = `<option value="">${placeholder}</option>`;
    el.value = "";
  }

  stateEl.addEventListener("change", async () => {
    const state = stateEl.value;

    resetSelect(districtEl, "Select district");
    resetSelect(areaEl, "Select area");
    districtEl.disabled = true;
    areaEl.disabled = true;
    fullEl.value = "";

    if (!state) return;

    // Fill districts
    const dList = districtsByState[state] || [];
    districtEl.innerHTML = `<option value="">Select district</option>` +
      dList.map(d => `<option value="${d}">${d}</option>`).join("");
    districtEl.disabled = false;

    // Preload areas JSON for this state (if exists)
    districtEl._areasData = await loadAreasFileForState(state);
  });

 districtEl.addEventListener("change", () => {
  const state = stateEl.value;
  const district = districtEl.value;

  resetSelect(areaEl, "Select area");
  areaEl.disabled = true;
  fullEl.value = "";

  // Hide custom input by default
  const customWrapper = document.getElementById("ad-area-custom-wrapper");
  const customInput = document.getElementById("ad-area-custom");
  if (customWrapper) customWrapper.style.display = "none";
  if (customInput) {
    customInput.required = false;
    customInput.value = "";
  }

  const areasData = districtEl._areasData;
  if (!areasData || !district) return;

  const districtObj = (areasData.districts || []).find(d => d.name === district);
  const allAreas = districtObj ? (districtObj.areas || []) : [];
  const areas = allAreas.filter(a => a.popular !== false); // Show popular + undefined (default true)

  // Populate dropdown + add "Other" option
  areaEl.innerHTML = `<option value="">Select area</option>` +
    areas.map(a => `<option value="${a.name}">${a.name}</option>`).join("") +
    `<option value="__other__">Other (type location)</option>`;
  areaEl.disabled = false;
});

  areaEl.addEventListener("change", () => {
  const state = stateEl.value;
  const district = districtEl.value;
  const area = areaEl.value;

  const customWrapper = document.getElementById("ad-area-custom-wrapper");
  const customInput = document.getElementById("ad-area-custom");

  // Show custom input if "Other" selected
  if (area === "__other__") {
    if (customWrapper) customWrapper.style.display = "block";
    if (customInput) {
      customInput.required = true;
      customInput.focus();
    }
    areaEl.required = false;
    fullEl.value = "";
  } else {
    if (customWrapper) customWrapper.style.display = "none";
    if (customInput) {
      customInput.required = false;
      customInput.value = "";
    }
    areaEl.required = true;
    fullEl.value = area ? `${area}, ${district}, ${state}` : "";
  }
  
});
  // Handle custom area input
  const customInput = document.getElementById("ad-area-custom");
  if (customInput) {
    customInput.addEventListener("input", () => {
      const state = stateEl.value;
      const district = districtEl.value;
      fullEl.value = customInput.value ? `${customInput.value}, ${district}, ${state}` : "";
    });
  }

}

// Call it
initAdLocations();

init();

// Fix: Remove name attributes from hidden category fields before submit
document.querySelector('form[name="project-submit"]').addEventListener('submit', function(e) {
  // Find all category field containers
  const sections = ['fields-apartment', 'fields-house', 'fields-commercial', 'fields-land'];
  
  sections.forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (section && section.style.display === 'none') {
      // Remove name attribute from all inputs/selects in hidden sections
      section.querySelectorAll('input, select, textarea').forEach(field => {
        if (field.name) {
          field.setAttribute('data-original-name', field.name);
          field.removeAttribute('name');
        }
      });
    }
  });
});
// 1. Declare this at the VERY TOP so it's ready before init() runs
let allProperties = []; 

async function loadProjectsHeroBackground() {
  const hero = document.getElementById("projectsHero");
  if (!hero) return;

  try {
    // Correct path to your CMS settings
    const res = await fetch("content/settings/projects-hero.json", { cache: "no-store" });
    if (!res.ok) return;

    const data = await res.json();

    // This re-links your CMS image variables
    if (data.heroDesktop) hero.style.setProperty("--hero-desktop", `url("${data.heroDesktop}")`);
    if (data.heroTablet) hero.style.setProperty("--hero-tablet", `url("${data.heroTablet}")`);
    if (data.heroMobile) hero.style.setProperty("--hero-mobile", `url("${data.heroMobile}")`);
  } catch (e) {
    console.log("Hero Image Error:", e);
  }
}

async function init() {
  try {
    // Fetch from the correct folder we set up in Make.com
    const res = await fetch("data/projects.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not find data/projects.json");
    
    allProperties = await res.json();
    
    // Now that data is loaded, run these
    await loadProjectsHeroBackground();
    renderCards(allProperties);
    populateFilters(); // We'll consolidate the dropdown logic here
  } catch (e) {
    console.log("Init error:", e);
  }
}

function populateFilters() {
    const stateSelect = document.getElementById('filter-state');
    if (!stateSelect) return;
    
    // Clear existing and add fresh states from your data
    stateSelect.innerHTML = '<option value="">All States</option>';
    const states = [...new Set(allProperties.map(item => item.state))].filter(Boolean).sort();
    states.forEach(state => {
        stateSelect.innerHTML += `<option value="${state}">${state}</option>`;
    });
}

// 2. IMPORTANT: Remove any old document.getElementById('search-btn').addEventListener lines 
// at the bottom of your file, as they are causing the 'null' error in your screenshot.

document.addEventListener('DOMContentLoaded', init);
function clearFilters() {
    // 1. Reset all dropdown values
    document.getElementById('filter-listing-type').value = "";
    document.getElementById('filter-state').value = "";
    document.getElementById('filter-district').innerHTML = '<option value="">All Districts</option>';
    document.getElementById('filter-area').innerHTML = '<option value="">All Areas</option>';
    document.getElementById('filter-category').value = "";
    document.getElementById('filter-price-max').value = "";

    // 2. Show all properties again
    renderCards(allProperties);
}