/**
 * THE PROPERTY BRIEF — generate-listings.js
 * Fetches approved listings from Google Apps Script at build time.
 * Generates /listings/[slug].html per listing with full schema.
 * Appends listing URLs to sitemap.xml (run AFTER generate-posts.js).
 */

const fs   = require('fs');
const path = require('path');

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5ok2RE-YFLkCASmlBDtPnc8WnKpnHjlFvDdFa0XqWJv_BGiaPN0B84Lo66GMwmXjo/exec';

// ── Helpers ──────────────────────────────────────────────────

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D''""]/g, '')
    .replace(/[\u2014\u2013—–]/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

// Parse DD/MM/YYYY expiry dates from Google Sheets
function parseExpiry(str) {
  if (!str) return null;
  const parts = String(str).trim().split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

function formatPrice(val) {
  const num = parseInt(val);
  return isNaN(num) ? 'Contact for price' : 'RM ' + num.toLocaleString('en-MY');
}

function safeAttr(str) {
return String(str == null ? '' : str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Build HTML ───────────────────────────────────────────────

function buildListingHTML(listing, slug) {
  const title     = listing['Ad Title'] || 'Property Listing';
  const price     = formatPrice(listing['Price(RM)']);
  const state     = listing['State']    || '';
  const district  = listing['District'] || '';
  const area      = listing['Area']     || '';
  const locFull   = listing['Location Full'] || [area, district, state].filter(Boolean).join(', ');
  const desc      = listing['Description'] || '';
  const contact   = listing['Contact'] || '';
  const url       = `https://thepropertybrief.org/listings/${slug}`;

  const photos = ['Photo 1','Photo 2','Photo 3','Photo 4','Photo 5']
    .map(k => listing[k]).filter(Boolean);

  const ogImage   = photos[0] || 'https://thepropertybrief.org/og-image.jpg';
  const lt        = listing['Listing Type'] || '';
  const propType  = listing['Property Type'] || listing['Category'] || '';
  const bedsStr   = listing['Bedrooms']
    ? `${listing['Bedrooms']} bed`
    : listing['bedroomsMin']
      ? `${listing['bedroomsMin']}${listing['bedroomsMax'] ? '–' + listing['bedroomsMax'] : '+'} bed`
      : '';
  const sqftStr   = listing['Built Up (Sq.Ft.)']
    ? `${parseInt(listing['Built Up (Sq.Ft.)']).toLocaleString()} sqft`
    : '';
  const tenureStr = listing['Tenure'] || '';
  let metaRaw = `${title} — ${lt} ${propType} in ${locFull}. ${price}`;
  if (bedsStr)   metaRaw += `, ${bedsStr}`;
  if (sqftStr)   metaRaw += `, ${sqftStr}`;
  if (tenureStr) metaRaw += `. ${tenureStr}`;
  if (desc)      metaRaw += `. ${desc}`;
  const metaDesc  = safeAttr(metaRaw.slice(0, 155));
  const safeTitle = safeAttr(title);

  // PSF — calculated on the fly
  const psfVal = (listing['Price(RM)'] && listing['Built Up (Sq.Ft.)'] && parseInt(listing['Built Up (Sq.Ft.)']) > 0)
    ? Math.round(parseInt(listing['Price(RM)']) / parseInt(listing['Built Up (Sq.Ft.)']))
    : null;

  // Format YYYY-MM → "Jun 2027"
  function fmtCompletion(val) {
    if (!val) return null;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const str = String(val).trim();
    // Handle ISO timestamp from Google Sheets e.g. "2028-03-31T16:00:00.000Z"
    if (str.includes('T') || str.length > 7) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        // Google Sheets saves end-of-month — add 1 day to get the correct month
        const adjusted = new Date(d.getTime() + 24 * 60 * 60 * 1000);
        return months[adjusted.getUTCMonth()] + ' ' + adjusted.getUTCFullYear();
      }
    }
    // Handle clean YYYY-MM format
    const parts = str.split('-');
    if (parts.length === 2 && parts[0].length === 4) {
      const m = parseInt(parts[1]) - 1;
      return (months[m] || '') + ' ' + parts[0];
    }
    return str;
  }

  const isNL = listing['Listing Type'] === 'New Launch';

  // Details rows — grouped by category, only non-empty values shown
  const details = [
    // ── Identity ──────────────────────────────────────────────
    ['Listing Type',          listing['Listing Type']],
    ['Category',              listing['Category']],
    ['Property Type',         listing['Property Type']],
    ['Tenure',                listing['Tenure']],
    ['Land Title',            listing['Land Title']],
    ['Seller Type',           listing['Seller Type']],

    // ── New Launch ────────────────────────────────────────────
    ['Developer',             listing['developerName']],
    ['Expected Completion',   fmtCompletion(listing['expectedCompletion'])],
    ['Total Units',           listing['totalUnits']],
    ['Developer License',     listing['developerLicense']],
    ['Advertising Permit',    listing['advertisingPermit']],
    ['Bumi Discount',         listing['bumiDiscount'] ? listing['bumiDiscount'] + '%' : null],

    // ── Pricing ───────────────────────────────────────────────
    ['Price',                 price],
    ['Price Range',           (isNL && listing['priceToRm'])
                                ? `RM ${parseInt(listing['Price(RM)']).toLocaleString()} – RM ${parseInt(listing['priceToRm']).toLocaleString()}`
                                : null],
    ['Price Per Sqft (PSF)',  psfVal ? `RM ${psfVal.toLocaleString()} / sqft` : null],
    ['Maintenance Fee',       listing['maintenanceFee'] ? `RM ${listing['maintenanceFee']} / sqft / mth` : null],
    ['Sinking Fund',          listing['sinkingFund'] ? `RM ${listing['sinkingFund']} / sqft / mth` : null],

    // ── Unit Specs ────────────────────────────────────────────
    ['Bedrooms',              listing['Bedrooms']],
    ['Bedroom Range',         listing['bedroomsMin']
                                ? `${listing['bedroomsMin']}${listing['bedroomsMax'] ? '–'+listing['bedroomsMax'] : '+'}`
                                : null],
    ['Bathrooms',             listing['Bathrooms']],
    ['Built Up',              listing['Built Up (Sq.Ft.)'] ? `${parseInt(listing['Built Up (Sq.Ft.)']).toLocaleString()} sqft` : null],
    ['Built Up Range',        listing['builtUpMin']
                                ? `${parseInt(listing['builtUpMin']).toLocaleString()}${listing['builtUpMax'] ? '–'+parseInt(listing['builtUpMax']).toLocaleString() : '+'} sqft`
                                : null],
    ['Land Area',             listing['landAreaValue']
                                ? `${listing['landAreaValue']} ${listing['landAreaUnit'] || ''}`
                                : listing['Land Size'] ? `${listing['Land Size']} sqft` : null],
    ['Car Park',              listing['Parking'] ? `${listing['Parking']} bay(s)` : null],
    ['Storeys',               listing['Storey Count']],
    ['Floor Level',           listing['floorLevel']],
    ['Lot Type',              listing['lotType']],
    ['Gated & Guarded',       listing['gatedGuarded']],

    // ── For Sale / Rent ───────────────────────────────────────
    ['Furnishing',            listing['furnishing']],
    ['Condition',             listing['renovationCondition']],
    ['Occupancy',             listing['occupancyStatus']],
    ['Available From',        listing['availableFrom']],
    ['Min Tenancy',           listing['minTenancy']],
    ['Pets Allowed',          listing['petsAllowed']],

    // ── Commercial ───────────────────────────────────────────
    ['Corner Lot',            listing['cornerLot']],
    ['Loading Bay',           listing['loadingBay']],
    ['Electrical Supply',     listing['electricalSupply']],
    ['Zoning',                listing['currentZoning']],
    ['Gross Floor Area',      listing['grossFloorArea'] ? `${parseInt(listing['grossFloorArea']).toLocaleString()} sqft` : null],

    // ── Land ──────────────────────────────────────────────────
    ['Topography',            listing['topography']],
    ['Approved Zoning',       listing['approvedZoning']],
    ['Road Frontage',         listing['roadFrontage'] ? `${listing['roadFrontage']}m` : null],
    ['Water Supply',          listing['waterSupply']],
    ['Electricity Supply',    listing['electricSupply']],

    // ── Location ─────────────────────────────────────────────
    ['State',                 state],
    ['District',              district],
    ['Area',                  area],

    // ── Connectivity ─────────────────────────────────────────
    ['MRT/LRT/BRT',           listing['nearestTransit']],
    ['Highway',               listing['nearestHighway']],
    ['Shopping Mall',         listing['nearestShoppingMall']],
    ['School/University',     listing['nearestSchoolUni']],
    ['Hospital/Clinic',       listing['nearestHospital']],
  ].filter(([, v]) => v);

  // Photo gallery
  const galleryHtml = photos.length ? `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;margin:1.5rem 0;">
      ${photos.map((src, i) => `<img src="${safeAttr(src)}" alt="${safeTitle} — ${safeAttr(listing['Property Type'] || listing['Category'] || '')} in ${safeAttr(locFull)} — Photo ${i + 1}" style="width:100%;border-radius:8px;aspect-ratio:4/3;object-fit:cover;cursor:zoom-in;" loading="${i === 0 ? 'eager' : 'lazy'}" onclick="openLightbox(${i})" />`).join('\n      ')}
    </div>
    <!-- Lightbox -->
    <div id="lightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.93);z-index:9999;align-items:center;justify-content:center;flex-direction:column;" onclick="closeLightbox(event)">
      <button onclick="closeLightbox()" style="position:fixed;top:16px;right:20px;background:none;border:none;color:#fff;font-size:2rem;cursor:pointer;z-index:10001;line-height:1;" aria-label="Close">✕</button>
      <button onclick="shiftLightbox(-1);event.stopPropagation();" style="position:fixed;left:12px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.1);border:none;color:#fff;font-size:2rem;cursor:pointer;padding:12px 16px;border-radius:8px;z-index:10001;" aria-label="Previous">‹</button>
      <button onclick="shiftLightbox(1);event.stopPropagation();" style="position:fixed;right:12px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.1);border:none;color:#fff;font-size:2rem;cursor:pointer;padding:12px 16px;border-radius:8px;z-index:10001;" aria-label="Next">›</button>
      <img id="lightbox-img" src="" alt="" style="max-width:92vw;max-height:88vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.6);" onclick="event.stopPropagation()" />
      <p id="lightbox-counter" style="color:#aaa;font-size:0.85rem;margin-top:12px;"></p>
    </div>` : '';

  // Details table
  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;margin:1.5rem 0;">
      ${details.map(([label, value]) => `
      <tr style="border-bottom:1px solid rgba(0,0,0,0.08);">
        <td style="padding:10px 0;font-weight:600;width:40%;color:var(--muted,#555);font-size:0.9rem;">${label}</td>
        <td style="padding:10px 0;font-size:0.9rem;">${safeAttr(String(value))}</td>
      </tr>`).join('')}
    </table>`;

  // Contact + WhatsApp CTA
  const contactTrimmed = String(contact || '').trim();
  const waNum = contactTrimmed.replace(/\D/g, '').replace(/^0/, '');
  const waMsg = encodeURIComponent(`Hi, I'm interested in your listing: ${title} (${url})`);

  let ctaHtml = '';
  if (contactTrimmed) {
    // Email contact
    if (contactTrimmed.includes('@')) {
      ctaHtml = `
        <div style="margin-top:1.5rem;">
          <p style="margin-bottom:0.75rem;font-size:0.95rem;">${safeAttr(contactTrimmed)}</p>
          <a href="mailto:${safeAttr(contactTrimmed)}"
             class="btnPrimary"
             style="width:auto;display:inline-block;text-decoration:none;">
            ✉️ Email Agent
          </a>
        </div>`;
    // Phone contact
    } else if ((contactTrimmed.match(/\d/g) || []).length >= 6) {
      const cleanNum  = contactTrimmed.replace(/[\s\-\(\)]/g, '');
      const waFormatted = cleanNum.startsWith('0') ? '60' + cleanNum.substring(1) : cleanNum.replace(/^\+/, '');
      ctaHtml = `
        <div style="margin-top:1.5rem;">
          <p style="margin-bottom:0.75rem;font-size:0.95rem;">${safeAttr(contactTrimmed)}</p>
          <div style="display:flex;flex-wrap:wrap;gap:0.75rem;">
            <a href="https://wa.me/${waFormatted}?text=${waMsg}"
               target="_blank" rel="noopener"
               class="btnPrimary"
               style="width:auto;display:inline-block;text-decoration:none;">
              💬 WhatsApp Agent
            </a>
            <a href="tel:${safeAttr(cleanNum)}"
               class="btnPrimary"
               style="width:auto;display:inline-block;text-decoration:none;background:transparent;border:2px solid #f5c800;color:#f5c800;">
              📞 Call Agent
            </a>
          </div>
        </div>`;
    // Fallback — plain text
    } else {
      ctaHtml = `<p style="margin-top:1.5rem;font-size:0.95rem;">${safeAttr(contactTrimmed)}</p>`;
    }
  }

  // JSON-LD — RealEstateListing schema
  const schemaObj = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": title,
    "description": desc || [
      lt && propType ? `${lt} ${propType}` : (propType || lt),
      locFull        ? `in ${locFull}`     : '',
      price,
      tenureStr,
      bedsStr        ? `${bedsStr}rooms`   : '',
      sqftStr
    ].filter(Boolean).join('. '),
    "url": url,
    "image": photos.length ? photos : undefined,
    "offers": {
      "@type": "Offer",
      "price": listing['Price(RM)'] || '',
      "priceCurrency": "MYR",
      "availability": "https://schema.org/InStock"
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": locFull,
      "addressLocality": area || district,
      "addressRegion": state,
      "addressCountry": "MY"
    },
    "additionalProperty": details.map(([name, value]) => ({
      "@type": "PropertyValue",
      "name": name,
      "value": String(value)
    })),
    "publisher": {
      "@type": "Organization",
      "name": "The Property Brief",
      "url": "https://thepropertybrief.org",
      "logo": {
        "@type": "ImageObject",
        "url": "https://thepropertybrief.org/android-chrome-512x512.png"
      }
    }
  };

  // Remove undefined keys before serialising
  const jsonLd = JSON.stringify(schemaObj, (k, v) => v === undefined ? undefined : v, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — The Property Brief Listings</title>
  <meta name="description" content="${metaDesc}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${safeTitle} — The Property Brief" />
  <meta property="og:description" content="${metaDesc}" />
  <meta property="og:image" content="${safeAttr(ogImage)}" />
  <meta property="og:locale" content="en_MY" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${metaDesc}" />
  <meta name="twitter:image" content="${safeAttr(ogImage)}" />

  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/styles.css" />

    <script type="application/ld+json">
  ${jsonLd}
  </script>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://thepropertybrief.org" },
      { "@type": "ListItem", "position": 2, "name": "Property Listings", "item": "https://thepropertybrief.org/projects.html" },
      { "@type": "ListItem", "position": 3, "name": "${safeTitle}", "item": "${url}" }
    ]
  }
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
      <a href="/projects.html" aria-current="page">Listings</a>
    </nav>
  </header>

  <main class="container" style="padding-top:2rem;padding-bottom:3rem;">
    <div class="maincol">
      <a href="/projects.html"
         style="display:inline-block;margin-bottom:1.5rem;color:inherit;font-size:0.9rem;opacity:0.7;">
        ← Back to Listings
      </a>

      <article>
        <p class="tag" style="margin-bottom:0.5rem;">${safeAttr(listing['Category'] || '')} • ${safeAttr(listing['Listing Type'] || '')}</p>
        <h1 style="margin-bottom:0.5rem;">${safeTitle}</h1>
        <p class="muted" style="font-size:1.1rem;font-weight:700;margin-bottom:0.5rem;">${price}</p>
        <p class="muted" style="margin-bottom:1.5rem;">📍 ${safeAttr(locFull)}</p>

        ${galleryHtml}
        ${tableHtml}

        ${desc ? `
        <h2 style="margin-top:2rem;margin-bottom:1rem;">Description</h2>
        <p class="muted" style="line-height:1.8;white-space:pre-line;">${safeAttr(desc)}</p>` : ''}

        ${(listing['facilitiesStandard'] || listing['facilitiesCustom']) ? `
        <h2 style="margin-top:2rem;margin-bottom:1rem;">🏊 Facilities</h2>
        ${listing['facilitiesStandard'] ? `
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1rem;">
          ${listing['facilitiesStandard'].split(',').map(f => `<span style="padding:4px 12px;background:rgba(249,209,0,0.12);border:1px solid rgba(249,209,0,0.3);border-radius:20px;font-size:0.85rem;">${safeAttr(f.trim())}</span>`).join('')}
        </div>` : ''}
        ${listing['facilitiesCustom'] ? `
        <ul style="margin:0;padding-left:1.2rem;line-height:2;">
          ${listing['facilitiesCustom'].split('\n').filter(f => f.trim()).map(f => `<li>${safeAttr(f.trim())}</li>`).join('')}
        </ul>` : ''}` : ''}

        ${ctaHtml}
      </article>

      <div style="margin-top:3rem;padding-top:1.5rem;border-top:1px solid rgba(0,0,0,0.1);">
        <a href="/projects.html" style="font-weight:600;">← Back to All Listings</a>
      </div>
    </div>
  </main>

  <footer class="footer">
    <small>© ${new Date().getFullYear()} THE PROPERTY BRIEF</small>
  </footer>
  <script src="/CONFIG.js"></script>
  <script src="/menu.js"></script>
  <script>
    const _photos = ${JSON.stringify(photos)};
    let _current  = 0;

    function openLightbox(index) {
      _current = index;
      const lb = document.getElementById('lightbox');
      lb.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      updateLightbox();
    }

    function closeLightbox(e) {
      if (e && e.target !== document.getElementById('lightbox')) return;
      document.getElementById('lightbox').style.display = 'none';
      document.body.style.overflow = '';
    }

    function shiftLightbox(dir) {
      _current = (_current + dir + _photos.length) % _photos.length;
      updateLightbox();
    }

    function updateLightbox() {
      const img = document.getElementById('lightbox-img');
      const counter = document.getElementById('lightbox-counter');
      img.src = _photos[_current];
      counter.textContent = (_current + 1) + ' / ' + _photos.length;
      // Hide nav arrows if only 1 photo
      document.querySelectorAll('#lightbox button[aria-label="Previous"], #lightbox button[aria-label="Next"]')
        .forEach(btn => btn.style.display = _photos.length <= 1 ? 'none' : 'block');
    }

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      const lb = document.getElementById('lightbox');
      if (!lb || lb.style.display === 'none') return;
      if (e.key === 'ArrowLeft')  shiftLightbox(-1);
      if (e.key === 'ArrowRight') shiftLightbox(1);
      if (e.key === 'Escape') {
        lb.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  </script>
</body>
</html>`;
}

// ── Main ─────────────────────────────────────────────────────

async function run() {
  console.log('🏠 Generating listing pages...');

  // Ensure /listings/ folder exists
  const listingsDir = path.join(__dirname, 'listings');
  if (!fs.existsSync(listingsDir)) fs.mkdirSync(listingsDir);

  // Fetch from Google Apps Script (follows redirects automatically)
  let raw;
  try {
    const res = await fetch(SCRIPT_URL, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } catch (err) {
    console.warn('⚠️  Could not fetch listings:', err.message);
    console.warn('   Skipping listing generation — build continues safely.');
    process.exit(0);
  }

    const listings = (Array.isArray(raw) ? raw : []).filter(p => {
    return p['Ad Title'] && p['Ad Title'] !== '';
  });

  console.log(`   Found ${listings.length} approved active listing(s).`);

  // Generate pages with duplicate-slug protection
  const usedSlugs = {};
  const listingUrls = [];

  listings.forEach(listing => {
    const titlePart = slugify(listing['Ad Title'] || 'listing');
    const areaPart  = slugify(listing['Area'] || listing['District'] || '');
    const ltPart    = slugify(listing['Listing Type'] || '');
    const rawBase   = [titlePart, areaPart, ltPart].filter(Boolean).join('-');
    let base = rawBase.replace(/-{2,}/g, '-') || 'listing';
    let slug = base;
    if (usedSlugs[base]) {
      usedSlugs[base]++;
      slug = `${base}-${usedSlugs[base]}`;
    } else {
      usedSlugs[base] = 1;
    }

    const html    = buildListingHTML(listing, slug);
    const outPath = path.join(listingsDir, `${slug}.html`);
    fs.writeFileSync(outPath, html);
    listingUrls.push(`https://thepropertybrief.org/listings/${slug}`);
  });

  console.log(`✅ Generated ${listingUrls.length} listing page(s)`);

  // Append to sitemap.xml (already created by generate-posts.js)
  if (listingUrls.length > 0 && fs.existsSync('sitemap.xml')) {
    const todayStr = new Date().toISOString().split('T')[0];
    const entries  = listingUrls.map(url => `  <url>
    <loc>${url}</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n');

    let sitemap = fs.readFileSync('sitemap.xml', 'utf8');
    sitemap = sitemap.replace('</urlset>', `${entries}\n</urlset>`);
    fs.writeFileSync('sitemap.xml', sitemap);
    console.log(`✅ Added ${listingUrls.length} listing URL(s) to sitemap.xml`);
  }
}

run();
