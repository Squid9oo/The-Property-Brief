/* ========================================
   THE PROPERTY BRIEF — compare.js
   Property comparison page logic
   Session 18
======================================== */

// ============ STATE ============
let compareData   = [];  // user-selected listings (2–3)
let columnVisible = [];  // true/false per column index

// ============ ROW DEFINITIONS ============
// render(property) → inner HTML string, or null (shows "—")
// When property is null → sponsored column
const ROWS = [
  {
    label: 'Price',
    render: p => {
      if (!p) return null;
      const price = p['Price(RM)'] ? parseInt(p['Price(RM)']).toLocaleString() : null;
      if (!price) return null;
      const isNL = p['Listing Type'] === 'New Launch' && p.priceToRm;
      const to   = isNL ? parseInt(p.priceToRm).toLocaleString() : null;
      return isNL && to
        ? `<strong>From RM ${price}</strong><br><small style="color:var(--muted);">Up to RM ${to}</small>`
        : `<strong>RM ${price}</strong>`;
    }
  },
  {
    label: 'Price PSF',
    render: p => {
      if (!p) return null;
      const price = parseInt(p['Price(RM)']);
      const sqft  = parseInt(p['Built Up (Sq.Ft.)']);
      if (!price || !sqft || sqft === 0) return null;
      const psf = Math.round(price / sqft);
      return `<span class="psf-val" data-psf="${psf}">RM ${psf.toLocaleString()} / sqft</span>`;
    }
  },
  {
    label: 'Built-up',
    render: p => {
      if (!p) return null;
      const isNL = p['Listing Type'] === 'New Launch';
      if (isNL && p.builtUpMin) {
        const max = p.builtUpMax ? ` – ${parseInt(p.builtUpMax).toLocaleString()}` : '+';
        return `${parseInt(p.builtUpMin).toLocaleString()}${max} sqft`;
      }
      return p['Built Up (Sq.Ft.)']
        ? `${parseInt(p['Built Up (Sq.Ft.)']).toLocaleString()} sqft`
        : null;
    }
  },
  {
    label: 'Bedrooms',
    render: p => {
      if (!p) return null;
      const isNL = p['Listing Type'] === 'New Launch';
      if (isNL && p.bedroomsMin) {
        return p.bedroomsMax ? `${p.bedroomsMin} – ${p.bedroomsMax}` : `${p.bedroomsMin}+`;
      }
      return p.Bedrooms || null;
    }
  },
  {
    label: 'Bathrooms',
    render: p => (!p ? null : p.Bathrooms || null)
  },
  {
    label: 'Tenure',
    render: p => (!p ? null : p.Tenure || null)
  },
  {
    label: 'Developer',
    render: p => (!p ? null : p.developerName || null)
  },
  {
    label: 'Completion',
    render: p => (!p ? null : p.expectedCompletion ? formatCompletion(p.expectedCompletion) : null)
  },
  {
    label: 'Maint. Fee',
    render: p => (!p ? null : p.maintenanceFee ? `RM ${p.maintenanceFee} psf/mo` : null)
  },
  {
    label: 'G&G',
    render: p => {
      if (!p || !p.gatedGuarded) return null;
      return p.gatedGuarded === 'Yes'
        ? `<span class="cell-yes">✅ Yes</span>`
        : `<span class="cell-no">✗ No</span>`;
    }
  },
  {
    label: 'Nearest MRT',
    render: p => (!p ? null : p.nearestTransit || null)
  },
  {
    label: 'Highway',
    render: p => (!p ? null : p.nearestHighway || null)
  },
  {
    label: 'Nearest Mall',
    render: p => (!p ? null : p.nearestShoppingMall || null)
  },
  {
    label: 'Facilities',
    render: (p, colIdx) => {
      if (!p) return null;
      const std    = p.facilitiesStandard ? p.facilitiesStandard.split(',').map(f => f.trim()).filter(Boolean) : [];
      const custom = p.facilitiesCustom   ? p.facilitiesCustom.split('\n').map(f => f.trim()).filter(Boolean)  : [];
      const all    = [...std, ...custom];
      if (!all.length) return null;
      const id    = `fac-${colIdx}`;
      const pills = all.map(f => `<span class="fac-pill">${f}</span>`).join('');
      return `<span class="facilities-count">${all.length} facilities</span>
        <button class="facilities-expand-btn" onclick="toggleFacilities('${id}')">▼ Show all</button>
        <div class="facilities-pill-list" id="${id}">${pills}</div>`;
    }
  },
  {
    label: 'Location',
    render: p => {
      if (!p) return null;
      return p['Location Full']
        || [p.District, p.State].filter(Boolean).join(', ')
        || p.State
        || null;
    }
  },
  {
    label: 'Finance',
    render: p => {
      if (!p) {
        // Sponsored column — show advertise CTA
        return `<a href="/advertise.html" class="col-action-btn col-action-advertise" target="_blank" rel="noopener">📣 Advertise Here</a>`;
      }
      return `<a href="/calculator.html" class="col-action-btn" target="_blank" rel="noopener">🧮 Calculate Finance</a>`;
    }
  }
];

// ============ CELL BUILDER ============

function buildCell(content, colIdx) {
  const isSponsored = colIdx === 0;
  if (content === null || content === undefined) {
    const cls = isSponsored ? 'sponsored-cell' : 'empty-cell';
    return `<td class="${cls}" data-col="${colIdx}">—</td>`;
  }
  const cls = isSponsored ? 'data-cell sponsored-cell' : 'data-cell';
  return `<td class="${cls}" data-col="${colIdx}">${content}</td>`;
}

// ============ HELPERS ============

function formatCompletion(val) {
  if (!val) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const str = String(val).trim();
  if (str.includes('T') || str.length > 7) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const adj = new Date(d.getTime() + 86400000);
      return months[adj.getUTCMonth()] + ' ' + adj.getUTCFullYear();
    }
  }
  const parts = str.split('-');
  if (parts.length === 2 && parts[0].length === 4) {
    return (months[parseInt(parts[1]) - 1] || '') + ' ' + parts[0];
  }
  return str;
}

function getFirstPhoto(p) {
  for (let i = 1; i <= 5; i++) {
    const photo = p[`Photo ${i}`];
    if (photo && photo.trim()) {
      let url = photo.trim();
      if (url.includes('lh3.googleusercontent.com') && !url.includes('=s')) url += '=s600';
      return url;
    }
  }
  return 'https://via.placeholder.com/400x300?text=No+Photo';
}

function makeListingURL(p) {
  const sl = str => (str || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  const slug = [sl(p['Ad Title'] || 'listing'), sl(p['Area'] || p['District'] || ''), sl(p['Listing Type'] || '')]
    .filter(Boolean).join('-').replace(/-{2,}/g, '-');
  return `/listings/${slug || 'listing'}`;
}

// ============ TABLE RENDERING ============

function buildSponsoredHeader() {
  return `<th class="col-header" data-col="0">
    <div class="col-header-inner sponsored-inner">
      <span class="sponsored-badge">⭐ Sponsored</span>
      <img src="/assets/Logo TPB White.png" class="sponsored-logo" alt="The Property Brief" />
      <p class="sponsored-placeholder-text">Showcase your project to buyers actively comparing properties</p>
      <a href="/advertise.html" class="sponsored-cta-btn" target="_blank" rel="noopener">Book This Slot →</a>
    </div>
  </th>`;
}

function buildListingHeader(p, colIdx) {
  const photo    = getFirstPhoto(p);
  const url      = makeListingURL(p);
  const badgeCls = (p['Listing Type'] || '').toLowerCase().replace(/\s+/g, '-');
  const price    = p['Price(RM)'] ? parseInt(p['Price(RM)']).toLocaleString() : null;
  const isNL     = p['Listing Type'] === 'New Launch';
  const priceLabel = price ? (isNL ? `From RM ${price}` : `RM ${price}`) : '';

  return `<th class="col-header" data-col="${colIdx}">
    <div class="col-header-inner">
      <img src="${photo}" class="col-header-photo" alt="${p['Ad Title'] || 'Property'}" loading="lazy" />
      <div class="col-header-meta">
        <span class="status-badge ${badgeCls}">${p['Listing Type'] || ''}</span>
      </div>
      <p class="col-header-name">${p['Ad Title'] || 'Property'}</p>
      ${priceLabel ? `<p class="col-header-price">${priceLabel}</p>` : ''}
      <a href="${url}" class="col-view-btn" target="_blank" rel="noopener">View Listing →</a>
    </div>
  </th>`;
}

function renderTable() {
  const thead = document.getElementById('compare-thead');
  const tbody = document.getElementById('compare-tbody');
  if (!thead || !tbody) return;

  // Header
  thead.innerHTML = `<tr>
    <th class="row-label" data-col="label"></th>
    ${buildSponsoredHeader()}
    ${compareData.map((p, i) => buildListingHeader(p, i + 1)).join('')}
  </tr>`;

  // Body rows
  tbody.innerHTML = ROWS.map(row => {
    const isFacilities = row.label === 'Facilities';
    const cells = [
      // Col 0: Sponsored
      buildCell(isFacilities ? row.render(null, 0) : row.render(null), 0),
      // Col 1–3: User listings
      ...compareData.map((p, i) =>
        buildCell(isFacilities ? row.render(p, i + 1) : row.render(p), i + 1)
      )
    ].join('');

    return `<tr>
      <td class="row-label" data-col="label">${row.label}</td>
      ${cells}
    </tr>`;
  }).join('');

  highlightBestPSF();
  applyColumnVisibility();
}

function highlightBestPSF() {
  const vals = [];
  document.querySelectorAll('.psf-val').forEach(el => {
    const v = parseInt(el.getAttribute('data-psf'));
    if (!isNaN(v)) vals.push({ el, v });
  });
  if (vals.length < 2) return;
  const min = Math.min(...vals.map(x => x.v));
  const max = Math.max(...vals.map(x => x.v));
  vals.forEach(({ el, v }) => {
    if (v === min) el.classList.add('psf-best');
    if (v === max) el.classList.add('psf-worst');
  });
}

// ============ COLUMN VISIBILITY ============

function applyColumnVisibility() {
  const total = 1 + compareData.length;
  for (let i = 0; i < total; i++) {
    const show = columnVisible[i] !== false;
    document.querySelectorAll(`[data-col="${i}"]`).forEach(cell => {
      cell.classList.toggle('col-hidden', !show);
    });
  }
  renderVisibilityBar();
}

function toggleColumn(colIdx) {
  columnVisible[colIdx] = !columnVisible[colIdx];
  applyColumnVisibility();
}

function renderVisibilityBar() {
  const bar = document.getElementById('col-visibility-bar');
  if (!bar) return;
  const labels = [
    '⭐ Sponsored',
    ...compareData.map((p, i) => {
      const n = p['Ad Title'] || `Property ${i + 1}`;
      return n.length > 22 ? n.substring(0, 20) + '…' : n;
    })
  ];
  bar.innerHTML = `<span class="col-vis-label">Show/Hide:</span>
    ${labels.map((label, i) => {
      const isVisible   = columnVisible[i] !== false;
      const isSponsored = i === 0;
      return `<button
        class="col-vis-btn ${isSponsored ? 'is-sponsored' : ''} ${!isVisible ? 'is-hidden' : ''}"
        onclick="toggleColumn(${i})"
        aria-pressed="${isVisible}"
        aria-label="${isVisible ? 'Hide' : 'Show'} ${label}"
      >${isVisible ? '👁 ' : '🚫 '}${label}</button>`;
    }).join('')}`;
}

// ============ FACILITIES TOGGLE ============

function toggleFacilities(id) {
  const el  = document.getElementById(id);
  const btn = el ? el.previousElementSibling : null;
  if (!el) return;
  const expanded = el.classList.toggle('expanded');
  if (btn) btn.textContent = expanded ? '▲ Show less' : '▼ Show all';
}

// ============ PAGE META ============

function updatePageMeta() {
  if (!compareData.length) return;
  const names = compareData.map(p => p['Ad Title'] || 'Property');
  document.title = `Compare: ${names.join(' vs ')} | The Property Brief`;
  const h1 = document.getElementById('compare-page-title');
  const sub = document.getElementById('compare-page-sub');
  if (h1) h1.textContent = `Compare Properties (${compareData.length} selected)`;
  if (sub) {
    const short = names.map(n => n.length > 28 ? n.substring(0, 26) + '…' : n);
    sub.textContent = `${short.join(' vs ')} — plus a sponsored project worth considering.`;
  }
}

// ============ INIT ============

document.addEventListener('DOMContentLoaded', () => {
  try {
    const raw = sessionStorage.getItem('tpb_compare');
    if (!raw) { window.location.href = '/projects.html'; return; }

    compareData = JSON.parse(raw);
    if (!Array.isArray(compareData) || compareData.length < 2) {
      window.location.href = '/projects.html';
      return;
    }

    // Mobile default: sponsored + col 1 visible, cols 2 & 3 hidden
    const isMobile = window.innerWidth <= 820;
    columnVisible = new Array(1 + compareData.length).fill(true);
    if (isMobile && compareData.length >= 2) columnVisible[2] = false;
    if (isMobile && compareData.length >= 3) columnVisible[3] = false;

    updatePageMeta();
    renderTable();

  } catch (e) {
    console.error('Compare init error:', e);
    window.location.href = '/projects.html';
  }
});

// Expose to global (used in onclick attributes)
window.toggleColumn     = toggleColumn;
window.toggleFacilities = toggleFacilities;