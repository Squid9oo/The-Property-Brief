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
  const metaDesc  = safeAttr(
    `${title} — ${price} — ${locFull}. ${desc}`.slice(0, 155)
  );
  const safeTitle = safeAttr(title);

  // PSF — calculated on the fly
  const psfVal = (listing['Price(RM)'] && listing['Built Up (Sq.Ft.)'] && parseInt(listing['Built Up (Sq.Ft.)']) > 0)
    ? Math.round(parseInt(listing['Price(RM)']) / parseInt(listing['Built Up (Sq.Ft.)']))
    : null;

  // Format YYYY-MM → "Jun 2027"
  function fmtCompletion(val) {
    if (!val) return null;
    const parts = String(val).split('-');
    if (parts.length !== 2) return val;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return (months[parseInt(parts[1]) - 1] || '') + ' ' + parts[0];
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
      ${photos.map((src, i) => `<img src="${safeAttr(src)}" alt="${safeTitle} photo ${i + 1}" style="width:100%;border-radius:8px;aspect-ratio:4/3;object-fit:cover;" loading="${i === 0 ? 'eager' : 'lazy'}" />`).join('\n      ')}
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

  // WhatsApp CTA
  const waNum = String(contact || '').replace(/\D/g, '').replace(/^0/, '');
  const waMsg = encodeURIComponent(`Hi, I'm interested in your listing: ${title} (${url})`);
  const ctaHtml = waNum ? `
    <a href="https://wa.me/60${waNum}?text=${waMsg}"
       target="_blank" rel="noopener"
       class="btnPrimary"
       style="width:auto;display:inline-block;text-decoration:none;margin-top:1.5rem;">
      💬 WhatsApp Agent
    </a>` : '';

  // JSON-LD — RealEstateListing schema
  const schemaObj = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": title,
    "description": desc,
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
    let base = slugify(listing['Ad Title']) || 'listing';
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
