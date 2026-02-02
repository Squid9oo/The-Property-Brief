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

async function init() {
  const res = await fetch("projects.json", { cache: "no-store" });
  allProjects = await res.json();
  apply();
}

document.getElementById("btn-search").addEventListener("click", apply);
document.getElementById("btn-reset").addEventListener("click", () => {
  document.getElementById("filter-location").value = "";
  document.getElementById("filter-type").value = "";
  document.getElementById("filter-min").value = "";
  document.getElementById("filter-max").value = "";
  document.getElementById("filter-q").value = "";
  apply();
});

init();
