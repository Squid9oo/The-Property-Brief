let allProjects = [];

function money(n) {
  if (typeof n !== "number") return "";
  return "RM " + n.toLocaleString("en-MY");
}

function matchesFilters(p) {
  const loc = document.getElementById("filter-location").value.trim();
  const type = document.getElementById("filter-type").value.trim();
  const min = Number(document.getElementById("filter-min").value || 0);
  const maxRaw = document.getElementById("filter-max").value;
  const max = maxRaw === "" ? Infinity : Number(maxRaw);
  const q = document.getElementById("filter-q").value.trim().toLowerCase();

  const hay = `${p.name} ${p.location} ${p.state} ${p.developer || ""}`.toLowerCase();

  if (loc && !(p.country === loc || p.state === loc || p.location === loc)) return false;
  if (type && p.type !== type) return false;
  if (p.priceFrom < min) return false;
  if (p.priceFrom > max) return false;
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
