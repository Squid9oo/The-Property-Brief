// ========================================
// FOOTER YEAR
// ========================================
const yearEl = document.querySelector("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ========================================
// LOAD POSTS FROM JSON
// ========================================
let allNews = [];
let allStrategies = [];

fetch('posts.json')
  .then(res => res.json())
  .then(data => {
    allNews = data.news || [];
    allStrategies = data.strategies || [];
    
    // Render initial posts (6 each)
    renderSection('latestList', allNews, 6, 'news');
    renderSection('strategiesList', allStrategies, 6, 'strategies');
  })
  .catch(err => {
    console.error('Error loading posts:', err);
    // Fallback: show message
    const latestEl = document.querySelector("#latestList");
    const stratEl = document.querySelector("#strategiesList");
    if (latestEl) latestEl.innerHTML = '<p class="muted">No news posts yet. Add some via /admin!</p>';
    if (stratEl) stratEl.innerHTML = '<p class="muted">No strategy posts yet. Add some via /admin!</p>';
  });

// ========================================
// RENDER FUNCTIONS
// ========================================
function renderSection(elementId, posts, limit, sectionType) {
  const container = document.querySelector(`#${elementId}`);
  if (!container) return;
  
  const postsToShow = posts.slice(0, limit);
  const hasMore = posts.length > limit;
  
  container.innerHTML = renderCards(postsToShow, sectionType) + 
    (hasMore ? `<button class="btnLoadMore" data-section="${sectionType}" data-shown="${limit}">Load More</button>` : '');
}

function renderCards(items, sectionType) {
  return items
    .map((p) => `
      <article class="postCard">
        <h3>${p.title}</h3>
        <p class="postMeta">${p.tag} • ${new Date(p.date).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'})}</p>
        ${p.summary ? `<p class="muted" style="margin-top:10px;">${p.summary}</p>` : ""}
        ${sectionType === 'strategies' && p.id ? `<button class="btnGhost openBtn" data-id="${p.id}" type="button">Open</button>` : ""}
      </article>
    `)
    .join("");
}

// ========================================
// LOAD MORE FUNCTIONALITY
// ========================================
document.addEventListener('click', (e) => {
  const loadMoreBtn = e.target.closest('.btnLoadMore');
  if (loadMoreBtn) {
    const section = loadMoreBtn.getAttribute('data-section');
    const currentShown = parseInt(loadMoreBtn.getAttribute('data-shown'));
    const newShown = currentShown + 6;
    
    if (section === 'news') {
      renderSection('latestList', allNews, newShown, 'news');
    } else if (section === 'strategies') {
      renderSection('strategiesList', allStrategies, newShown, 'strategies');
    }
  }
});

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
  const post = allStrategies.find((x) => x.id === id);
  if (!post) return;

  openModal(post.title, formatPostBody(post));
});

function formatPostBody(post) {
  let html = post.body || '';
  
  // Add video thumbnail if videoId exists
  if (post.videoId) {
    html = `
      <div class="videoThumb videoSmall" data-video="${post.videoId}">
        <img src="https://img.youtube.com/vi/${post.videoId}/hqdefault.jpg" alt="Video thumbnail" />
        <div class="playBadge">Play</div>
      </div>
    ` + html;
  }
  
  // Add image if exists
  if (post.image) {
    html = `<img src="${post.image}" alt="Post image" class="postMediaImg" />` + html;
  }
  
  return html;
}

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