// ========================================
// FOOTER YEAR
// ========================================
const yearEl = document.querySelector("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ========================================
// CONTENT DATABASE (v1)
// ========================================

// Latest news (simple cards, no modal)
const latestNews = [
  { title: "Malaysia: Key signals to watch this week", date: "2026-01-27", tag: "Malaysia • News" },
  { title: "Singapore: What developers are doing differently in 2026", date: "2026-01-26", tag: "Singapore • News" },
  { title: "Thailand: Demand pockets that are still moving", date: "2026-01-25", tag: "Thailand • News" }
];

// Strategies (full posts with modals)
const strategies = [
  {
    id: "redevelop-content-with-ai",
    title: "Don't just consume content—redevelop it with AI",
    date: "2026-01-27",
    tag: "Strategy • Workflow",
    summary: "A simple workflow: take a useful video, feed it into AI with your intention, and extract structured insights for your team.",
    contentHtml: `
      <p>In our field, we come across useful videos, ideas, and insights almost every day.</p>
      <p>Most people watch, nod, and move on. That's where the opportunity dies. When I find content relevant to sales, marketing, consumer psychology, or team development, I treat it as raw material—something I can reshape into practical value. And with AI, this process has never been easier or faster.</p>

      <h3>The input</h3>
      <p>I watched a solid video and instead of just saving it, I fed it into AI along with my intentions.</p>
      <div class="videoThumb videoSmall" data-video="K7TPA6GdBqI">
        <img src="https://img.youtube.com/vi/K7TPA6GdBqI/hqdefault.jpg" alt="Video thumbnail" />
        <div class="playBadge">Play</div>
      </div>
       
      <h3>The workflow (real example)</h3>
      <p>I'm sharing my prompt screenshot (not because it's perfect) but to show how simple the workflow can be.</p>
      <p><img src="assets/prompting.jpg" alt="Prompting workflow screenshot" class="postMediaImg" /></p>

      <h3>The result</h3>
      <p>Within minutes, AI turned that video into structured insights I can use for my team.</p>

      <h3>My takeaway</h3>
      <p>This isn't about replacing thinking. It's about training ourselves to think better and letting technology amplify that thinking.</p>
      <p>Don't just consume content. Redevelop it. Adapt it. Extract value from it. The real skill today is turning information into output quickly.</p>
    `
  },
  {
    id: "unlocking-location-value",
    title: "Unlocking Location Value in Property Marketing",
    date: "2026-01-29",
    tag: "Strategy • Marketing",
    summary: "How to leverage neighbourhood strengths when internal amenities aren't your strongest selling point.",
    contentHtml: `
      <p>Property marketers don't always have internal amenities that stand out as their strongest selling point. But what if we could "borrow" the strengths from the neighbourhood instead?</p>

      <h3>The Sunway Lagoon example</h3>
      <p>Consider properties near Sunway Lagoon. Instead of just highlighting proximity, why not run a digital campaign offering a free theme park day pass for lead generation? For actual buyers, give a truly unique reward: a 5-year annual pass to Sunway Lagoon, which means up to 1,825 days of free family fun, making lifestyle and experience part of the value proposition.</p>

      <h3>Why limit the campaign to 3 months?</h3>
      <p>To create urgency, this campaign would run for only 3 months. Why? Because effective marketing is about storytelling and stories need momentum and fresh twists to stay compelling. Extending a campaign indefinitely leads to audience fatigue, switching strategies every quarter keeps the message vibrant and prospects engaged.</p>

      <h3>The template for other locations</h3>
      <p>For those marketing properties outside Sunway, this strategy is just a template. Audit your local area for interesting lifestyle spots—whether it's a theme park, retail hub, cultural centre, or nature retreat—and craft an irresistible campaign that leverages those neighbourhood strengths.</p>

      <h3>Bottom line</h3>
      <p>Don't just sell units, sell gateways to experiences people desire.</p>
    `
  }
];

// ========================================
// RENDER FUNCTIONS
// ========================================

function renderCards(items) {
  return items
    .map((p) => `
      <article class="postCard">
        <h3>${p.title}</h3>
        <p class="postMeta">${p.tag} • ${p.date}</p>
        ${p.summary ? `<p class="muted" style="margin-top:10px;">${p.summary}</p>` : ""}
        ${p.id ? `<button class="btnGhost openBtn" data-id="${p.id}" type="button">Open</button>` : ""}
      </article>
    `)
    .join("");
}

// ========================================
// RENDER CONTENT ON PAGE LOAD
// ========================================

// Render latest news
const latestList = document.querySelector("#latestList");
if (latestList) {
  latestList.innerHTML = renderCards(latestNews);
}

// Render strategies
const strategiesEl = document.querySelector("#strategiesList");
if (strategiesEl) {
  strategiesEl.innerHTML = renderCards(strategies);
}

// ========================================
// MODAL & VIDEO INTERACTION
// ========================================

document.addEventListener("click", (e) => {
  // Handle video thumbnail clicks
  const thumb = e.target.closest(".videoThumb");
  if (thumb) {
    const videoId = thumb.getAttribute("data-video");
    openVideoModal(videoId);
    return;
  }

  // Handle "Open" button clicks
  const btn = e.target.closest(".openBtn");
  if (!btn) return;

  const id = btn.getAttribute("data-id");
  const post = strategies.find((x) => x.id === id);
  if (!post) return;

  openModal(post.title, post.contentHtml);
});

// Open a text/content modal
function openModal(title, html) {
  const modal = document.createElement("div");
  modal.className = "modalOverlay";
  modal.innerHTML = `
    <div class="modal">
      <div class="modalTop">
        <h3 style="margin:0;">${title}</h3>
        <button class="modalX" id="closeModal" type="button" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modalBody">${html}</div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    const clickedClose = e.target.closest("#closeModal");
    const clickedOverlay = e.target.classList.contains("modalOverlay");
    if (clickedOverlay || clickedClose) {
      modal.remove();
    }
  });
}

// Open a video modal
function openVideoModal(videoId) {
  const modal = document.createElement("div");
  modal.className = "modalOverlay";
  modal.innerHTML = `
    <div class="modal">
      <div class="modalTop">
        <h3 style="margin:0;">Video</h3>
        <button class="modalX" id="closeModal" type="button" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="videoWrap">
        <iframe
          src="https://www.youtube.com/embed/${videoId}?autoplay=1"
          title="YouTube video player"
          frameborder="0"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    const clickedClose = e.target.closest("#closeModal");
    const clickedOverlay = e.target.classList.contains("modalOverlay");
    if (clickedOverlay || clickedClose) {
      modal.remove();
    }
  });
}
