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
let allSponsored = [];
let sponsoredTimer = null;

fetch('posts.json')
  .then(res => res.json())
  .then(data => {
    allNews = data.news || [];
    allStrategies = data.strategies || [];
    allSponsored = data.sponsored || [];
    initSponsoredRotator(allSponsored);
    
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

function cleanExcerpt(text, max = 180) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max).trim() + "…" : t;
}

function renderCards(items, sectionType) {
  return items
    .map((p) => `
      <article class="postCard">
        <h3>${p.title}</h3>

        <p class="postMeta">
          <span class="tagPill">${p.tag || "Update"}</span>
          <span class="metaDot">•</span>
          <span>${new Date(p.date).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'})}</span>
        </p>

        ${p.summary ? `<p class="muted cardSummary">${cleanExcerpt(p.summary, 180)}</p>` : ""}
        ${p.id ? `<button class="btnGhost openBtn" data-id="${p.id}" type="button">Read more</button>` : ""}
      </article>
    `)
    .join("");
    
function initSponsoredRotator(ads) {
  const linkEl = document.getElementById("sponsoredAdLink");
  const imgEl = document.getElementById("sponsoredAdImg");
  const titleEl = document.getElementById("sponsoredAdTitle");
  const noteEl = document.getElementById("sponsoredAdNote");
  if (!linkEl || !imgEl || !titleEl) return;

  const activeAds = (ads || []).filter(a => a && a.active !== false && a.image && a.link);

  if (activeAds.length === 0) {
    titleEl.textContent = "Your banner here";
    imgEl.style.display = "none";
    linkEl.href = "mailto:thianlong@gmail.com";
    if (noteEl) noteEl.textContent = "No sponsored ads yet (add some via /admin).";
    return;
  }

  let i = 0;

  function showAd(ad) {
    linkEl.href = ad.link;
    titleEl.textContent = ad.title || "Sponsored";
    imgEl.src = ad.image;
    imgEl.alt = ad.alt || ad.title || "Sponsored ad";
    imgEl.style.display = "block";
    if (noteEl) noteEl.textContent = "";
  }

  showAd(activeAds[i]);

  if (sponsoredTimer) clearInterval(sponsoredTimer);
  sponsoredTimer = setInterval(() => {
    i = (i + 1) % activeAds.length;
    showAd(activeAds[i]);
  }, 5000);
}
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
  const post = [...allNews, ...allStrategies].find((x) => x.id === id);
  if (!post) return;

  openModal(post.title, formatPostBody(post));
});

function formatPostBody(post) {
  let bodyText = post.body || '';
  
  // Build media HTML
  const videoHtml = post.videoId ? `
    <div class="videoThumb videoSmall" data-video="${post.videoId}">
      <img src="https://img.youtube.com/vi/${post.videoId}/hqdefault.jpg" alt="Video thumbnail" />
      <div class="playBadge">Play</div>
    </div>
  ` : '';
  
  const imageHtml = post.image ? `<img src="${post.image}" alt="Post image" class="postMediaImg" />` : '';
  
  const pdfHtml = post.pdf ? `
    <div class="pdfDownloadBox">
      ${post.pdfPreview ? `<img src="${post.pdfPreview}" alt="PDF preview" class="pdfPreviewImg" />` : ''}
      <a href="${post.pdf}" target="_blank" rel="noopener" download class="btnPrimary" style="width:auto; display:inline-block; margin-top:12px;">
        📄 Download Full PDF
      </a>
    </div>
  ` : '';
  
  // Check if placeholders are used
  const hasVideoPH = bodyText.includes('{{VIDEO}}');
  const hasImagePH = bodyText.includes('{{IMAGE}}');
  const hasPdfPH = bodyText.includes('{{PDF}}');
  
  // Replace placeholders BEFORE converting Markdown
  bodyText = bodyText.replace(/\{\{VIDEO\}\}/g, '{{VIDEO_PLACEHOLDER}}');
  bodyText = bodyText.replace(/\{\{IMAGE\}\}/g, '{{IMAGE_PLACEHOLDER}}');
  bodyText = bodyText.replace(/\{\{PDF\}\}/g, '{{PDF_PLACEHOLDER}}');
  
  // Convert Markdown to HTML
  let html = marked.parse(bodyText);
  
  // Now replace the placeholders with actual HTML
  html = html.replace(/\{\{VIDEO_PLACEHOLDER\}\}/g, videoHtml);
  html = html.replace(/\{\{IMAGE_PLACEHOLDER\}\}/g, imageHtml);
  html = html.replace(/\{\{PDF_PLACEHOLDER\}\}/g, pdfHtml);
  
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