/* ========================================
   THE PROPERTY BRIEF — Clean app.js
   Keeps same behavior:
   - Load posts.json (news/strategies/sponsored)
   - Render initial cards + Load More
   - Sponsored rotator
   - Modal (post + video)
   - Search (min 3 chars, last 30 days default, highlight, compact results)
======================================== */

(() => {
  // ----------------------------
  // Footer year
  // ----------------------------
  const yearEl = document.querySelector("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ----------------------------
  // State
  // ----------------------------
  let allNews = [];
  let allStrategies = [];
  let allSponsored = [];
  let sponsoredTimer = null;

  // ----------------------------
  // Helpers
  // ----------------------------
  function qs(sel) {
    return document.querySelector(sel);
  }

  function fmtHumanDate(dateStr) {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  function cleanExcerpt(text, max = 180) {
    const t = (text || "").replace(/\s+/g, " ").trim();
    return t.length > max ? t.slice(0, max).trim() + "…" : t;
  }

  function escapeHtml(str) {
    return (str || "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeRegExp(str) {
    return (str || "").toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function norm(s) {
    return (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim();
  }

  function stripMarkdown(md) {
    const s = (md || "").toString();
    return s
      .replace(/!\[.*?\]\(.*?\)/g, " ")           // images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")   // links -> text
      .replace(/`{1,3}[\s\S]*?`{1,3}/g, " ")     // code
      .replace(/[#>*_~\-]+/g, " ")               // basic md chars
      .replace(/\s+/g, " ")
      .trim();
  }

  function makeSnippet(text, rawQuery, maxLen = 120) {
    const clean = stripMarkdown(text || "");
    if (!clean) return "";

    const q = (rawQuery || "").toLowerCase().trim();
    if (!q) return clean.slice(0, maxLen);

    const idx = clean.toLowerCase().indexOf(q);
    if (idx === -1) return clean.slice(0, maxLen);

    const start = Math.max(0, idx - 40);
    const end = Math.min(clean.length, idx + q.length + 60);
    let snip = clean.slice(start, end).trim();

    if (start > 0) snip = "… " + snip;
    if (end < clean.length) snip = snip + " …";
    return snip;
  }

  function highlightText(text, rawQuery) {
    const safe = escapeHtml(text || "");
    const raw = (rawQuery || "").trim();
    if (!raw) return safe;

    const terms = raw
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);

    if (terms.length === 0) return safe;

    const pattern = terms.map(escapeRegExp).join("|");
    const re = new RegExp(`(${pattern})`, "gi");
    return safe.replace(re, `<mark class="hl">$1</mark>`);
  }

  function getHaystack(post) {
    return norm(`${post.title || ""} ${post.summary || ""} ${post.body || ""}`);
  }

  function fmtDateISO(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function setDefaultLast30Days(fromEl, toEl) {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 30);

    toEl.value = fmtDateISO(today);
    fromEl.value = fmtDateISO(from);
  }

  function inDateRange(postDateISO, fromValue, toValue) {
    if (!postDateISO) return true;

    const postTime = new Date(postDateISO).getTime();
    if (Number.isNaN(postTime)) return true;

    if (fromValue) {
      const fromTime = new Date(fromValue + "T00:00:00").getTime();
      if (!Number.isNaN(fromTime) && postTime < fromTime) return false;
    }

    if (toValue) {
      const toTime = new Date(toValue + "T23:59:59").getTime();
      if (!Number.isNaN(toTime) && postTime > toTime) return false;
    }

    return true;
  }

  // ----------------------------
  // Rendering
  // ----------------------------
  function renderCards(items) {
    return items
      .map(
        (p) => `
        <article class="postCard">
          <h3>${escapeHtml(p.title || "Untitled")}</h3>

          <p class="postMeta">
            <span class="tagPill">${escapeHtml(p.tag || "Update")}</span>
            <span class="metaDot">•</span>
            <span>${fmtHumanDate(p.date)}</span>
          </p>

          ${p.summary ? `<p class="muted cardSummary">${escapeHtml(cleanExcerpt(p.summary, 180))}</p>` : ""}
          ${p.id ? `<button class="btnGhost openBtn" data-id="${escapeHtml(p.id)}" type="button">Read more</button>` : ""}
        </article>
      `
      )
      .join("");
  }

  function renderSection(elementId, posts, limit, sectionType) {
    const container = qs(`#${elementId}`);
    if (!container) return;

    const postsToShow = (posts || []).slice(0, limit);
    const hasMore = (posts || []).length > limit;

    container.innerHTML =
      renderCards(postsToShow) +
      (hasMore
        ? `<button class="btnLoadMore" data-section="${sectionType}" data-shown="${limit}">Load More</button>`
        : "");
  }

  // ----------------------------
  // Sponsored rotator
  // ----------------------------
  function initSponsoredRotator(ads) {
    const linkEl = document.getElementById("sponsoredAdLink");
    const imgEl = document.getElementById("sponsoredAdImg");
    const titleEl = document.getElementById("sponsoredAdTitle");
    const noteEl = document.getElementById("sponsoredAdNote");
    if (!linkEl || !imgEl || !titleEl) return;

    const activeAds = (ads || []).filter(
      (a) => a && a.active !== false && a.image && a.link
    );

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
      if (noteEl) noteEl.textContent = ad.description || "Tap/click to learn more.";
    }

    showAd(activeAds[i]);

    if (sponsoredTimer) clearInterval(sponsoredTimer);
    sponsoredTimer = setInterval(() => {
      i = (i + 1) % activeAds.length;
      showAd(activeAds[i]);
    }, 5000);
  }

  // ----------------------------
  // Modal + content formatting
  // ----------------------------
  function formatPostBody(post) {
    // Requires marked.min.js in index.html (already included)
    const bodyText = (post && post.body) ? String(post.body) : "";

    const videoHtml = post.videoId
      ? `
        <div class="videoThumb videoSmall" data-video="${escapeHtml(post.videoId)}">
          <img src="https://img.youtube.com/vi/${escapeHtml(post.videoId)}/hqdefault.jpg" alt="Video thumbnail" />
          <div class="playBadge">Play</div>
        </div>
      `
      : "";

    const imageHtml = post.image
      ? `<img src="${escapeHtml(post.image)}" alt="Post image" class="postMediaImg" />`
      : "";

    const pdfHtml = post.pdf
  ? `
    <div class="pdfDownloadBox">
      <div class="pdfViewer">
        <iframe
          class="pdfFrame"
          src="${escapeHtml(post.pdf)}"
          title="PDF preview"
          loading="lazy"
        ></iframe>
      </div>

      <a href="${escapeHtml(post.pdf)}" target="_blank" rel="noopener" download class="btnPrimary" style="width:auto; display:inline-block; margin-top:12px;">
        📄 Download Full PDF
      </a>
    </div>
  `
  : "";

    // Replace placeholders BEFORE markdown -> HTML
    let safe = bodyText
      .replace(/\{\{VIDEO\}\}/g, "{{VIDEO_PLACEHOLDER}}")
      .replace(/\{\{IMAGE\}\}/g, "{{IMAGE_PLACEHOLDER}}")
      .replace(/\{\{PDF\}\}/g, "{{PDF_PLACEHOLDER}}");

    let html = "";
    if (window.marked && typeof window.marked.parse === "function") {
      html = window.marked.parse(safe);
    } else {
      // fallback if marked isn't loaded
      html = `<pre>${escapeHtml(safe)}</pre>`;
    }

    // Inject media HTML
    html = html
      .replace(/\{\{VIDEO_PLACEHOLDER\}\}/g, videoHtml)
      .replace(/\{\{IMAGE_PLACEHOLDER\}\}/g, imageHtml)
      .replace(/\{\{PDF_PLACEHOLDER\}\}/g, pdfHtml);

    return html;
  }

  function openModal(title, html) {
    const modal = document.createElement("div");
    modal.className = "modalOverlay";
    modal.innerHTML = `
      <div class="modal">
        <div class="modalTop">
          <h3 style="margin:0;">${escapeHtml(title || "")}</h3>
          <button class="modalX" type="button" aria-label="Close" data-close="1">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modalBody">${html || ""}</div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      const clickedClose = e.target.closest('[data-close="1"]');
      const clickedOverlay = e.target.classList.contains("modalOverlay");
      if (clickedOverlay || clickedClose) modal.remove();
    });
  }

  function openVideoModal(videoId) {
    const vid = escapeHtml(videoId || "");
    const modal = document.createElement("div");
    modal.className = "modalOverlay";
    modal.innerHTML = `
      <div class="modal">
        <div class="modalTop">
          <h3 style="margin:0;">Video</h3>
          <button class="modalX" type="button" aria-label="Close" data-close="1">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div class="videoWrap">
          <iframe
            src="https://www.youtube.com/embed/${vid}?autoplay=1"
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
      const clickedClose = e.target.closest('[data-close="1"]');
      const clickedOverlay = e.target.classList.contains("modalOverlay");
      if (clickedOverlay || clickedClose) modal.remove();
    });
  }

  // ----------------------------
  // Search
  // ----------------------------
  function initSearch() {
    const inputEl = document.getElementById("searchInput");
    const sectionEl = document.getElementById("searchSection");
    const fromEl = document.getElementById("dateFrom");
    const toEl = document.getElementById("dateTo");
    const resultsEl = document.getElementById("searchResults");

    if (!inputEl || !sectionEl || !fromEl || !toEl || !resultsEl) return;

    // Always start with last 30 days visible
    setDefaultLast30Days(fromEl, toEl);

    function renderSearchResults(items, rawQuery) {
      if (!items || items.length === 0) {
        resultsEl.innerHTML = `<div class="muted">No matches.</div>`;
        return;
      }

      const MAX_RESULTS = 25;
      const shown = items.slice(0, MAX_RESULTS);

      const listHtml = shown
        .map((p) => {
          const section = p.__section === "strategies" ? "Strategies" : "News";
          const title = highlightText(p.title || "Untitled", rawQuery);

          const baseText =
            p.summary && String(p.summary).trim() ? p.summary : (p.body || "");
          const snippetRaw = makeSnippet(baseText, rawQuery, 120);
          const snippet = highlightText(snippetRaw, rawQuery);

          return `
            <div class="searchItem">
              <div class="searchItemTop">
                <span class="searchBadge">${section}</span>
                <span class="searchDateText">${fmtHumanDate(p.date)}</span>
              </div>

              <button class="openBtn searchTitle" data-id="${escapeHtml(p.id)}" type="button">
                ${title}
              </button>

              ${snippet ? `<div class="searchSnippet">${snippet}</div>` : ``}
            </div>
          `;
        })
        .join("");

      const countLine =
        items.length > MAX_RESULTS
          ? `<div class="searchCount muted">Showing ${MAX_RESULTS} of ${items.length}. Keep typing to narrow.</div>`
          : `<div class="searchCount muted">Showing ${items.length} result(s).</div>`;

      resultsEl.innerHTML = `
        ${countLine}
        <div class="searchResultList">${listHtml}</div>
      `;
    }

    function runSearch() {
      const raw = (inputEl.value || "").trim();
      const q = norm(raw);
      const which = sectionEl.value; // all | news | strategies
      const fromV = fromEl.value;
      const toV = toEl.value;

      // If user clears the box: reset filters + clear results
      if (q.length === 0) {
        sectionEl.value = "all";
        setDefaultLast30Days(fromEl, toEl);
        resultsEl.innerHTML = "";
        return;
      }

      // Minimum 3 characters: show nothing
      if (q.length < 3) {
        resultsEl.innerHTML = "";
        return;
      }

      const sources =
        which === "news"
          ? [{ type: "news", items: allNews }]
          : which === "strategies"
          ? [{ type: "strategies", items: allStrategies }]
          : [
              { type: "news", items: allNews },
              { type: "strategies", items: allStrategies },
            ];

      let merged = [];
      sources.forEach((s) => {
        (s.items || []).forEach((p) => merged.push({ ...p, __section: s.type }));
      });

      merged = merged.filter((p) => inDateRange(p.date, fromV, toV));
      merged = merged.filter((p) => getHaystack(p).includes(q));
      merged.sort((a, b) => new Date(b.date) - new Date(a.date));

      renderSearchResults(merged, raw);
    }

    inputEl.addEventListener("input", runSearch);
    sectionEl.addEventListener("change", runSearch);
    fromEl.addEventListener("change", runSearch);
    toEl.addEventListener("change", runSearch);
  }

  // ----------------------------
  // Global click handling (Load More + Open + Video)
  // ----------------------------
  document.addEventListener("click", (e) => {
    // Load More
    const loadMoreBtn = e.target.closest(".btnLoadMore");
    if (loadMoreBtn) {
      const section = loadMoreBtn.getAttribute("data-section");
      const currentShown = parseInt(loadMoreBtn.getAttribute("data-shown"), 10) || 0;
      const newShown = currentShown + 6;

      if (section === "news") renderSection("latestList", allNews, newShown, "news");
      if (section === "strategies") renderSection("strategiesList", allStrategies, newShown, "strategies");
      return;
    }

    // Video thumb
    const thumb = e.target.closest(".videoThumb");
    if (thumb) {
      const videoId = thumb.getAttribute("data-video");
      if (videoId) openVideoModal(videoId);
      return;
    }

    // Open post modal
    const btn = e.target.closest(".openBtn");
    if (btn) {
      const id = btn.getAttribute("data-id");
      const post = [...allNews, ...allStrategies].find((x) => x.id === id);
      if (!post) return;

      openModal(post.title || "", formatPostBody(post));
    }
  });

  // ----------------------------
  // Boot: load posts.json then render/init
  // ----------------------------
  async function boot() {
    try {
      const res = await fetch("posts.json", { cache: "no-store" });
      const data = await res.json();

      allNews = data.news || [];
      allStrategies = data.strategies || [];
      allSponsored = data.sponsored || [];

      initSponsoredRotator(allSponsored);

      renderSection("latestList", allNews, 6, "news");
      renderSection("strategiesList", allStrategies, 6, "strategies");

      initSearch();
    } catch (err) {
      console.error("Error loading posts:", err);

      const latestEl = qs("#latestList");
      const stratEl = qs("#strategiesList");

      if (latestEl) latestEl.innerHTML = '<p class="muted">No news posts yet. Add some via /admin!</p>';
      if (stratEl) stratEl.innerHTML = '<p class="muted">No strategy posts yet. Add some via /admin!</p>';
    }
  }

  boot();
})();
