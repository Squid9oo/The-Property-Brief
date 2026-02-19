const fs = require('fs');
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

// ── Generate robots.txt ──────────────────────────────────────
const robotsTxt = `User-agent: *
Allow: /
Sitemap: https://thepropertybrief.org/sitemap.xml`;

fs.writeFileSync('robots.txt', robotsTxt);
console.log('✅ Generated robots.txt');

// ── Generate sitemap.xml ─────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://thepropertybrief.org/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://thepropertybrief.org/projects.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

fs.writeFileSync('sitemap.xml', sitemapXml);
console.log('✅ Generated sitemap.xml');


