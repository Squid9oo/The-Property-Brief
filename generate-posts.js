const fs = require('fs');
const { marked } = require('marked');
const path = require('path');
const matter = require('gray-matter');

function getPosts(folder) {
  const dir = path.join(__dirname, 'content', folder);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  return files.map(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const { data, content: body } = matter(content);

    return {
      id: file.replace('.md', ''),
      title: data.title || 'Untitled',
      date: data.date || new Date().toISOString(),
      tag: data.tag || '',
      summary: data.summary || '',
      body: body || '',
      image: data.image || null,
      imageMobile: data.imageMobile || null,
      videoId: data.videoId || null,
      pdf: data.pdf || null,
      pdfPreview: data.pdfPreview || null,
      pdfTitle: data.pdfTitle || null,
      pdfDescription: data.pdfDescription || null,
      link: data.link || null,
      description: data.description || '',
      alt: data.alt || '',
      active: data.active !== undefined ? data.active : true,
      ctaText: data.ctaText || null,
      ctaUrl: data.ctaUrl || null,
      // ── New fields ──────────────────────────────────────────
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      category: data.category || '',
      tags: Array.isArray(data.tags)
        ? data.tags
        : typeof data.tags === 'string' && data.tags.trim()
          ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
          : [],
      author: data.author || 'The Property Brief',
      featured: data.featured || false,
      ctaText: data.ctaText || null,
      ctaUrl: data.ctaUrl || null,
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

const posts = {
  news: getPosts('news'),
  strategies: getPosts('strategies'),
  sponsored: getPosts('sponsored')
};

fs.writeFileSync('posts.json', JSON.stringify(posts, null, 2));
console.log('✅ Generated posts.json');
console.log('   News:', posts.news.length);
console.log('   Strategies:', posts.strategies.length);

// ── Output directories ────────────────────────────────────────
['news', 'strategies'].forEach(type => {
  const dir = path.join(__dirname, type);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// ── Gallery Slideshow Builder ────────────────────────────────
function buildGalleryHTML(gallery) {
  if (!gallery || gallery.length === 0) return { html: '', css: '', js: '' };

  const count = gallery.length;

  const slides = gallery.map((item, i) => {
    const safeAlt = (item.alt || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeCaption = item.caption
      ? item.caption.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : '';
    const captionHtml = safeCaption
      ? `\n      <p class="tpb-caption">${safeCaption}</p>`
      : '';
    return `    <div class="tpb-slide${i === 0 ? ' active' : ''}" role="group" aria-label="Image ${i + 1} of ${count}">
      <img src="${item.image}" alt="${safeAlt}" loading="${i === 0 ? 'eager' : 'lazy'}">${captionHtml}
    </div>`;
  }).join('\n');

  const dots = count > 1
    ? gallery.map((_, i) =>
        `<button class="tpb-dot${i === 0 ? ' active' : ''}" onclick="tpbGoto(this,${i})" aria-label="Go to image ${i + 1}"></button>`
      ).join('')
    : '';

  const controls = count > 1
    ? `\n  <button class="tpb-prev" onclick="tpbNav(this,-1)" aria-label="Previous image">&#8249;</button>
  <button class="tpb-next" onclick="tpbNav(this,1)" aria-label="Next image">&#8250;</button>
  <div class="tpb-dots">${dots}</div>
  <span class="tpb-counter">1\u00a0/\u00a0${count}</span>`
    : '';

  const html = `<div class="tpb-gallery" data-count="${count}" role="region" aria-label="Article image gallery">
${slides}${controls}
</div>`;

  const css = `<style>
.tpb-gallery{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:8px;background:#111;margin:0 0 1.75rem}
.tpb-slide{position:absolute;inset:0;opacity:0;transition:opacity .4s ease}
.tpb-slide.active{opacity:1;z-index:1}
.tpb-slide img{width:100%;height:100%;object-fit:cover;display:block}
.tpb-caption{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.6);color:#fff;padding:.4rem .85rem;font-size:.82rem;margin:0;z-index:2}
.tpb-prev,.tpb-next{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.45);color:#fff;border:none;border-radius:50%;width:2.5rem;height:2.5rem;font-size:1.6rem;line-height:1;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;transition:background .2s}
.tpb-prev:hover,.tpb-next:hover{background:rgba(0,0,0,.75)}
.tpb-prev:focus,.tpb-next:focus,.tpb-dot:focus{outline:2px solid #f5c800;outline-offset:2px}
.tpb-prev{left:.75rem}.tpb-next{right:.75rem}
.tpb-dots{position:absolute;bottom:.7rem;left:50%;transform:translateX(-50%);display:flex;gap:.4rem;z-index:10}
.tpb-dot{width:.55rem;height:.55rem;border-radius:50%;border:2px solid rgba(255,255,255,.85);background:transparent;cursor:pointer;padding:0;transition:background .2s}
.tpb-dot.active{background:#fff}
.tpb-counter{position:absolute;top:.7rem;right:.75rem;background:rgba(0,0,0,.5);color:#fff;padding:.15rem .5rem;border-radius:4px;font-size:.78rem;z-index:10}
@media(max-width:480px){.tpb-prev,.tpb-next{width:2rem;height:2rem;font-size:1.2rem}}
</style>`;

  const js = `<script>
function tpbNav(btn,dir){
  var g=btn.closest('.tpb-gallery'),sl=g.querySelectorAll('.tpb-slide'),
      dt=g.querySelectorAll('.tpb-dot'),ct=g.querySelector('.tpb-counter'),cur=0;
  for(var i=0;i<sl.length;i++){if(sl[i].classList.contains('active')){cur=i;break;}}
  sl[cur].classList.remove('active');if(dt[cur])dt[cur].classList.remove('active');
  cur=(cur+dir+sl.length)%sl.length;
  sl[cur].classList.add('active');if(dt[cur])dt[cur].classList.add('active');
  if(ct)ct.textContent=(cur+1)+'\u00a0/\u00a0'+sl.length;
}
function tpbGoto(dot,idx){
  var g=dot.closest('.tpb-gallery'),sl=g.querySelectorAll('.tpb-slide'),
      dt=g.querySelectorAll('.tpb-dot'),ct=g.querySelector('.tpb-counter');
  sl.forEach(function(s){s.classList.remove('active');});
  dt.forEach(function(d){d.classList.remove('active');});
  sl[idx].classList.add('active');if(dt[idx])dt[idx].classList.add('active');
  if(ct)ct.textContent=(idx+1)+'\u00a0/\u00a0'+sl.length;
}
</script>`;

  return { html, css, js };
}

// ── Article HTML Builder ──────────────────────────────────────
function buildArticleHTML(post, type, slug) {
  const url = `https://thepropertybrief.org/${type}/${slug}`;
  const schemaType = type === 'news' ? 'NewsArticle' : 'Article';
  const backLabel = type === 'news' ? 'News' : 'Strategies';
  const backHash = type === 'news' ? 'latest' : 'strategies';

  // ── SEO fields ────────────────────────────────────────────────
  const seoTitle = (post.seoTitle || post.title || '').replace(/"/g, '&quot;');
  const metaDesc = (post.seoDescription || post.summary || post.description || '')
    .slice(0, 160).replace(/"/g, '&quot;');
  const displaySummary = (post.summary || post.description || '')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ── OG Image: gallery[0] → featured image → default ──────────
  let ogImage = 'https://thepropertybrief.org/og-image.jpg';
  const rawOg = (post.gallery && post.gallery.length > 0 && post.gallery[0].image) || post.image;
  if (rawOg) {
    ogImage = rawOg.startsWith('http')
      ? rawOg
      : `https://thepropertybrief.org${rawOg.startsWith('/') ? '' : '/'}${rawOg}`;
  }

  const dateFormatted = new Date(post.date).toLocaleDateString('en-MY', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // ── Gallery Slideshow ─────────────────────────────────────────
  const gallery = buildGalleryHTML(post.gallery);

  // ── Video ─────────────────────────────────────────────────────
  const videoHtml = post.videoId
    ? `<div class="videoWrap" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1.5rem 0;">` +
      `<iframe style="position:absolute;top:0;left:0;width:100%;height:100%;" ` +
      `src="https://www.youtube.com/embed/${post.videoId}" frameborder="0" allowfullscreen></iframe></div>`
    : '';

  // ── Featured Image (body token) ───────────────────────────────
  const safeAlt = (post.alt || post.title || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const imgHtml = post.image
    ? `<img src="${post.image}" alt="${safeAlt}" style="max-width:100%;border-radius:8px;margin:1rem 0;" loading="lazy">`
    : '';

  // ── PDF Block (with title + description) ─────────────────────
  const pdfTitleHtml = post.pdfTitle
    ? `<strong style="display:block;margin-bottom:.4rem;font-size:1rem;">${post.pdfTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>`
    : '';
  const pdfDescHtml = post.pdfDescription
    ? `<p style="margin:.5rem 0 0;font-size:.85rem;opacity:.8;">${post.pdfDescription.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
    : '';
  const pdfHtml = post.pdf
    ? `<div style="margin:1.5rem 0;padding:1rem 1.25rem;background:rgba(245,200,0,.08);border-left:3px solid #f5c800;border-radius:0 6px 6px 0;">` +
      `${pdfTitleHtml}<a href="${post.pdf}" target="_blank" rel="noopener" ` +
      `style="display:inline-block;padding:10px 22px;background:#f5c800;color:#000;border-radius:6px;font-weight:700;text-decoration:none;margin:.25rem 0;">` +
      `📄 Download PDF</a>${pdfDescHtml}</div>`
    : '';

  // ── CTA Button ────────────────────────────────────────────────
  const ctaHtml = post.ctaText && post.ctaUrl
    ? `<div style="margin:2.5rem 0;text-align:center;">` +
      `<a href="${post.ctaUrl.replace(/"/g, '&quot;')}" target="_blank" rel="noopener" ` +
      `style="display:inline-block;padding:13px 30px;background:#f5c800;color:#000;border-radius:6px;font-weight:700;text-decoration:none;font-size:1rem;">` +
      `${post.ctaText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a></div>`
    : '';

  // ── Parse Markdown body ───────────────────────────────────────
  let body = (post.body || '')
    .replace('{{VIDEO}}', 'XXTPBVIDEOTOKENXX')
    .replace('{{IMAGE}}', 'XXTPBIMAGETOKENXX')
    .replace('{{PDF}}',   'XXTPBPDFTOKENXX');

  let htmlBody = marked.parse(body);
  htmlBody = htmlBody.replace('XXTPBVIDEOTOKENXX', videoHtml);
  htmlBody = htmlBody.replace('XXTPBIMAGETOKENXX', imgHtml);
  htmlBody = htmlBody.replace('XXTPBPDFTOKENXX',   pdfHtml);

  // ── Tag / Category line ───────────────────────────────────────
  const tagLineHtml = (post.category || post.tag)
    ? `<p style="margin-bottom:.5rem;">` +
      (post.category ? `<span class="tag" style="margin-right:.5rem;">${post.category}</span>` : '') +
      (post.tag      ? `<span class="tag">${post.tag}</span>` : '') +
      `</p>`
    : '';

  // ── Schema keywords ───────────────────────────────────────────
  const keywordsArr = [...(post.tags || []), post.category, post.tag].filter(Boolean);

  // ── JSON-LD ───────────────────────────────────────────────────
  const jsonLdObj = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "headline": post.title,
    "description": post.seoDescription || post.summary || '',
    "url": url,
    "datePublished": post.date,
    "dateModified": post.date,
    "image": ogImage,
    "author": post.author && post.author !== 'The Property Brief'
      ? { "@type": "Person", "name": post.author }
      : { "@type": "Organization", "name": "The Property Brief", "url": "https://thepropertybrief.org" },
    "publisher": {
      "@type": "Organization",
      "name": "The Property Brief",
      "logo": { "@type": "ImageObject", "url": "https://thepropertybrief.org/android-chrome-512x512.png" }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": url }
  };
  if (keywordsArr.length > 0) jsonLdObj.keywords = keywordsArr.join(', ');

  const jsonLd = JSON.stringify(jsonLdObj, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${seoTitle} — The Property Brief</title>
  <meta name="description" content="${metaDesc}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />

  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${seoTitle}" />
  <meta property="og:description" content="${metaDesc}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="en_MY" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${seoTitle}" />
  <meta name="twitter:description" content="${metaDesc}" />
  <meta name="twitter:image" content="${ogImage}" />

  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/styles.css" />
  ${gallery.css}

  <script type="application/ld+json">
  ${jsonLd}
  </script>

  <!-- Google Analytics GA4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-CR7KQDF1JX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-CR7KQDF1JX');
  </script>
</head>
<body>

  <header class="topbar">
    <div class="brand">
      <a href="/" aria-label="The Property Brief Home">
        <img src="/assets/Logo TPB White.png" alt="The Property Brief" class="logo" />
      </a>
    </div>
    <button class="hamburger" id="hamburger" type="button" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
    <nav class="nav" id="mainNav">
      <a href="/">Home</a>
      <a href="/#latest">News</a>
      <a href="/#strategies">Strategies</a>
      <a href="/#search">Search</a>
      <a href="/about.html">About</a>
      <a href="/projects.html">Listings</a>
    </nav>
  </header>

  <main class="container" style="padding-top:2rem;padding-bottom:3rem;">
    <div class="maincol">
      <a href="/#${backHash}"
         onclick="sessionStorage.setItem('scrollTo','${backHash}');return true;"
         style="display:inline-block;margin-bottom:1.5rem;color:inherit;font-size:0.9rem;opacity:0.7;">← Back to ${backLabel}</a>
      <article>
        ${tagLineHtml}
        <h1 style="margin-bottom:0.5rem;">${post.title}</h1>
        <p class="muted" style="font-size:0.85rem;margin-bottom:1.5rem;">${dateFormatted} · By ${post.author || 'The Property Brief'}</p>
        ${gallery.html}
        <div class="articleBody">
          ${htmlBody}
        </div>
        ${ctaHtml}
      </article>
      <div style="margin-top:3rem;padding-top:1.5rem;border-top:1px solid rgba(0,0,0,0.1);">
        <a href="/" style="font-weight:600;">← Back to The Property Brief</a>
      </div>
    </div>
  </main>

  <footer class="footer">
    <small>© ${new Date().getFullYear()} THE PROPERTY BRIEF</small>
  </footer>
  <script src="/CONFIG.js"></script>
  <script src="/menu.js"></script>
  ${gallery.js}
</body>
</html>`;
}

// ── Slugify ───────────────────────────────────────────────────
function slugify(str) {
  return str
    .replace(/[\u2018\u2019\u201C\u201D''""]/g, '')
    .replace(/[\u2014\u2013\u2014\u2013]/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Generate Article Pages ────────────────────────────────────
let articleCount = 0;
const allArticleUrls = [];

['news', 'strategies'].forEach(type => {
  posts[type].forEach(post => {
    if (post.active === false) return;
    const slug = slugify(post.id);
    const html = buildArticleHTML(post, type, slug);
    const outPath = path.join(__dirname, type, `${slug}.html`);
    fs.writeFileSync(outPath, html);
    allArticleUrls.push({ url: `https://thepropertybrief.org/${type}/${slug}`, date: post.date });
    articleCount++;
  });
});

console.log(`✅ Generated ${articleCount} article pages`);

// ── robots.txt ───────────────────────────────────────────────
const robotsTxt = `User-agent: *\nAllow: /\nSitemap: https://thepropertybrief.org/sitemap.xml`;
fs.writeFileSync('robots.txt', robotsTxt);
console.log('✅ Generated robots.txt');

// ── sitemap.xml ──────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

const staticUrls = [
  { url: 'https://thepropertybrief.org/',             changefreq: 'daily',   priority: '1.0', date: today },
  { url: 'https://thepropertybrief.org/about.html',   changefreq: 'monthly', priority: '0.8', date: today },
  { url: 'https://thepropertybrief.org/projects.html',changefreq: 'weekly',  priority: '0.7', date: today },
];

const articleUrlEntries = allArticleUrls.map(({ url, date }) => `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date(date).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n');

const staticUrlEntries = staticUrls.map(({ url, changefreq, priority, date }) => `  <url>
    <loc>${url}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n');

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrlEntries}
${articleUrlEntries}
</urlset>`;

fs.writeFileSync('sitemap.xml', sitemapXml);
console.log('✅ Generated sitemap.xml with', staticUrls.length + allArticleUrls.length, 'URLs');
