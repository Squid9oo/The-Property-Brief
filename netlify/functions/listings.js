// netlify/functions/listings.js
// Proxy your Google Apps Script JSON feed through your own domain.
// This prevents CORS issues in the browser and gives you one stable URL: /.netlify/functions/listings

exports.handler = async function handler() {
  const gasUrl = process.env.GAS_LISTINGS_URL;

  // Safe fallback: if GAS_LISTINGS_URL isn't set yet, don't break the site.
  // We return an empty array so the UI loads (it already handles 0 results).
  if (!gasUrl) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify([]),
    };
  }

  try {
    const res = await fetch(gasUrl, {
      headers: {
        // Some endpoints behave better with an explicit accept header.
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify({ error: 'Upstream feed error', status: res.status }),
      };
    }

    const text = await res.text();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ error: 'Proxy failed', message: String(err?.message || err) }),
    };
  }
};
