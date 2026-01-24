const app = document.querySelector("#app");
document.querySelector("#year").textContent = new Date().getFullYear();

const posts = [
  {
    id: "malaysia-rates-outlook",
    title: "Malaysia: What to watch in 2026 (rates, launches, sentiment)",
    category: "News",
    market: "Malaysia",
    date: "2026-01-24",
    summary: "A quick checklist of signals to track this quarter: financing, launch pipeline, take-up rates, and buyer sentiment."
  },
  {
    id: "developer-marketing-playbook",
    title: "Developer marketing: 7 simple ideas to increase leads without discounts",
    category: "Strategy",
    market: "SEA",
    date: "2026-01-24",
    summary: "Practical tactics from real sales floors: positioning, campaign structure, agent enablement, and content that converts."
  }
];

function route() {
  const hash = (location.hash || "#home").replace("#", "");
  if (hash.startsWith("post/")) {
    const postId = hash.split("/")[1];
    renderPost(postId);
    return;
  }

  switch (hash) {
    case "home": renderHome(); break;
    case "news": renderList("News"); break;
    case "strategy": renderList("Strategy"); break;
    case "markets": renderMarkets(); break;
    case "about": renderAbout(); break;
    default: renderHome();
  }
}

function renderHome() {
  app.innerHTML = `
    <section class="hero">
      <h1>Daily insights on Southeast Asia’s property markets</h1>
      <p>Covering Malaysia, Singapore, Thailand, Vietnam & Indonesia — plus practical property marketing strategies from the field.</p>
      <a class="btn" href="#news">Read latest</a>
    </section>

    <section class="grid">
      ${posts.slice(0, 4).map(cardHTML).join("")}
    </section>
  `;
}

function renderList(category) {
  const filtered = posts.filter(p => p.category === category);
  app.innerHTML = `
    <section class="hero">
      <h1>${category}</h1>
      <p>${category === "News" ? "Market updates and notable moves." : "Straightforward strategies you can apply."}</p>
    </section>

    <section class="grid">
      ${filtered.map(cardHTML).join("")}
    </section>
  `;
}

function renderPost(id) {
  const p = posts.find(x => x.id === id);
  if (!p) {
    app.innerHTML = `<section class="hero"><h1>Post not found</h1><p>Try going back to Home.</p><a class="btn" href="#home">Home</a></section>`;
    return;
  }

  app.innerHTML = `
    <section class="hero">
      <span class="tag">${p.category} • ${p.market} • ${p.date}</span>
      <h1>${p.title}</h1>
      <p>${p.summary}</p>
      <a class="btn" href="#${p.category.toLowerCase()}">Back</a>
    </section>
  `;
}

function renderMarkets() {
  app.innerHTML = `
    <section class="hero">
      <h1>Markets</h1>
      <p>Pick a market (v1 is placeholder; we’ll expand to real pages next).</p>
      <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
        ${["Malaysia","Singapore","Thailand","Vietnam","Indonesia"].map(m => `<span class="tag">${m}</span>`).join("")}
      </div>
    </section>
  `;
}

function renderAbout() {
  app.innerHTML = `
    <section class="hero">
      <h1>About</h1>
      <p>THE PROPERTY BRIEF shares no-fluff ASEAN property news and marketing strategy. Built for buyers, investors, agents, and developers.</p>
      <a class="btn" href="#home">Home</a>
    </section>
  `;
}

function cardHTML(p) {
  return `
    <article class="card">
      <span class="tag">${p.category} • ${p.market} • ${p.date}</span>
      <h3>${p.title}</h3>
      <p>${p.summary}</p>
      <a class="btn" href="#post/${p.id}">Open</a>
    </article>
  `;
}

window.addEventListener("hashchange", route);
route();
