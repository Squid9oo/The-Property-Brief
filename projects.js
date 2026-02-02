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
    const res = await fetch("content/settings/projects-hero.json", { cache: "no-store" });
    if (!res.ok) return;

    const data = await res.json();

    // Save the 3 image URLs as CSS variables
    if (data.heroDesktop) hero.style.setProperty("--hero-desktop", `url("${data.heroDesktop}")`);
    if (data.heroTablet) hero.style.setProperty("--hero-tablet", `url("${data.heroTablet}")`);
    if (data.heroMobile) hero.style.setProperty("--hero-mobile", `url("${data.heroMobile}")`);
  } catch (e) {}
}

async function init() {
  const res = await fetch("projects.json", { cache: "no-store" });
  allProjects = await res.json();
  await loadProjectsHeroBackground();
  apply();
}

document.getElementById("btn-search").addEventListener("click", apply);document.getElementById("btn-reset").addEventListener("click", () => {
  ["filter-location","filter-type","filter-q","filter-price","filter-tenure","filter-sale"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  apply();
});

if (window.Auth) window.Auth.initAuth();

init();
