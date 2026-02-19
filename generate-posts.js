const fs = require('fs');
const { marked } = require('marked');
const path = require('path');
const matter = require('gray-matter');

function getPosts(folder) {
  const dir = path.join(__dirname, 'content', folder);
  
  if (!fs.existsSync(dir)) {
    return [];
  }

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
      link: data.link || null,
      description: data.description || "",
      alt: data.alt || "",
      active: data.active !== undefined ? data.active : true,
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

// ── Generate Static Article Pages ────────────────────────────
['news', 'strategies'].forEach(type => {
  const dir = path.join(__dirname, type);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

function buildArticleHTML(post, type, slug) {
  const url = `https://thepropertybrief.org/${type}/${slug}`;
  const ogImage = post.image
    ? `https://thepropertybrief.org${post.image}`
    : 'https://thepropertybrief.org/og-image.jpg';
  const description = (post.summary || post.description || '').slice(0, 160)
    .replace(/"/g, '&quot;');
  const safeTitle = (post.title || '').replace(/"/g, '&quot;');
  const schemaType = type === 'news' ? 'NewsArticle' : 'Article';
  const backLabel = type === 'news' ? 'News' : 'Strategies';
  const backHash = type === 'news' ? 'latest' : 'strategies';
  const dateFormatted = new Date(post.date).toLocaleDateString('en-MY', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // Build media HTML strings
const videoHtml = post.videoId
  ? `<div class="videoWrap" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1.5rem 0;"><iframe style="position:absolute;top:0;left:0;width:100%;height:100%;" src="https://www.youtube.com/embed/${post.videoId}" frameborder="0" allowfullscreen></iframe></div>`
  : '';
const safeAlt = (post.alt || post.title || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const imgHtml = post.image
  ? `<img src="${post.image}" alt="${safeAlt}" style="max-width:100%;border-radius:8px;margin:1rem 0;" loading="lazy">`
  : '';
const pdfHtml = post.pdf
  ? `<a href="${post.pdf}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 20px;background:#f5c800;color:#000;border-radius:6px;font-weight:700;text-decoration:none;margin:1rem 0;">📄 View PDF</a>`
  : '';

// Swap {{placeholders}} with safe tokens so marked never sees raw HTML
let body = (post.body || '')
  .replace('{{VIDEO}}', 'XXTPBVIDEOTOKENXX')
  .replace('{{IMAGE}}', 'XXTPBIMAGETOKENXX')
  .replace('{{PDF}}', 'XXTPBPDFTOKENXX');

// Parse markdown FIRST, then inject media HTML into the result
let htmlBody = marked.parse(body);
htmlBody = htmlBody.replace('XXTPBVIDEOTOKENXX', videoHtml);
htmlBody = htmlBody.replace('XXTPBIMAGETOKENXX', imgHtml);
htmlBody = htmlBody.replace('XXTPBPDFTOKENXX', pdfHtml);

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": schemaType,
    "headline": post.title,
    "description": post.summary || '',
    "url": url,
    "datePublished": post.date,
    "dateModified": post.date,
    "image": ogImage,
    "author": {
      "@type": "Organization",
      "name": "The Property Brief",
      "url": "https://thepropertybrief.org"
    },
    "publisher": {
      "@type": "Organization",
      "name": "The Property Brief",
      "logo": {
        "@type": "ImageObject",
        "url": "https://thepropertybrief.org/android-chrome-512x512.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    }
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — The Property Brief</title>
  <meta name="description" content="${description}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />

  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="en_MY" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />

  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/styles.css" />

  <script type="application/ld+json">
${jsonLd}
  </script>
</head>
<body>
  <header class="topbar">
    <div class="brand">
      <a href="/" aria-label="The Property Brief Home">
        <img src="/assets/Logo TPB White.png" alt="The Property Brief" class="logo" />
      </a>
    </div>
    <nav class="nav">
      <a href="/">Home</a>
      <a href="/#latest">News</a>
      <a href="/#strategies">Strategies</a>
      <a href="/#about">About</a>
      <a href="/projects.html">Listings</a>
    </nav>
  </header>

  <main class="container" style="padding-top:2rem;padding-bottom:3rem;">
    <div class="maincol">
      <a href="/#${backHash}" style="display:inline-block;margin-bottom:1.5rem;color:inherit;font-size:0.9rem;opacity:0.7;">← Back to ${backLabel}</a>
      <article>
        <p class="tag" style="margin-bottom:0.5rem;">${post.tag || ''}</p>
        <h1 style="margin-bottom:0.5rem;">${post.title}</h1>
        <p class="muted" style="font-size:0.85rem;margin-bottom:1.5rem;">${dateFormatted}</p>
        <p class="sub" style="margin-bottom:2rem;">${description}</p>
        <div class="articleBody">
          ${htmlBody}
        </div>
      </article>
      <div style="margin-top:3rem;padding-top:1.5rem;border-top:1px solid rgba(0,0,0,0.1);">
        <a href="/" style="font-weight:600;">← Back to The Property Brief</a>
      </div>
    </div>
  </main>

  <footer class="footer">
    <small>© ${new Date().getFullYear()} THE PROPERTY BRIEF</small>
  </footer>
</body>
</html>`;
}

function slugify(str) {
  return str
    .replace(/[\u2018\u2019\u201C\u201D''""]/g, '') // remove curly quotes & apostrophes
    .replace(/[\u2014\u2013—–]/g, '-')               // em/en dashes to hyphen
    .replace(/[^a-zA-Z0-9-]/g, '-')                  // anything else to hyphen
    .replace(/-{2,}/g, '-')                           // collapse double hyphens
    .replace(/^-|-$/g, '');                           // trim leading/trailing hyphens
}

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

// ── Generate robots.txt ──────────────────────────────────────
const robotsTxt = `User-agent: *
Allow: /
Sitemap: https://thepropertybrief.org/sitemap.xml`;

fs.writeFileSync('robots.txt', robotsTxt);
console.log('✅ Generated robots.txt');

// ── Generate sitemap.xml ─────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

const staticUrls = [
  { url: 'https://thepropertybrief.org/', changefreq: 'daily', priority: '1.0', date: today },
  { url: 'https://thepropertybrief.org/projects.html', changefreq: 'weekly', priority: '0.8', date: today },
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
console.log('✅ Generated sitemap.xml with', 2 + allArticleUrls.length, 'URLs');

