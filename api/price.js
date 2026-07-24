// Vercel serverless function: GET /api/price?url=<product page url>
// Fetches the page server-side (no browser CORS limits) and tries to extract a price:
// JSON-LD offers → og/product meta tags → itemprop → embedded JSON → first $ amount.
// Returns { price: number|null, source: string|null }.
module.exports = async (req, res) => {
  const url = (req.query && req.query.url) || '';
  if (!/^https?:\/\//i.test(url)) { res.status(400).json({ error: 'invalid url' }); return; }
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    clearTimeout(to);
    if (!r.ok) { res.status(200).json({ price: null, reason: 'fetch ' + r.status }); return; }
    let html = await r.text();
    if (html.length > 2e6) html = html.slice(0, 2e6);
    const num = (s) => { const f = parseFloat(String(s).replace(/[, ]/g, '')); return (!isNaN(f) && f > 0 && f < 1e6) ? f : null; };
    let price = null, source = null;
    const ld = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of ld) {
      const body = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
      try {
        const walk = (o) => {
          if (!o || typeof o !== 'object') return null;
          if (o.price != null) return num(o.price);
          if (o.lowPrice != null) return num(o.lowPrice);
          if (o.offers) return walk(Array.isArray(o.offers) ? o.offers[0] : o.offers);
          if (Array.isArray(o)) { for (const x of o) { const p = walk(x); if (p) return p; } return null; }
          if (o['@graph']) return walk(o['@graph']);
          return null;
        };
        const p = walk(JSON.parse(body));
        if (p) { price = p; source = 'json-ld'; break; }
      } catch (e) {}
    }
    if (!price) {
      const m = html.match(/<meta[^>]+(?:property|name|itemprop)=["'](?:og:price:amount|product:price:amount|price)["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["'](?:og:price:amount|product:price:amount|price)["']/i);
      if (m) { price = num(m[1]); if (price) source = 'meta'; }
    }
    if (!price) {
      const m = html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i);
      if (m) { price = num(m[1]); if (price) source = 'itemprop'; }
    }
    if (!price) {
      const m = html.match(/["'](?:price|current_price|currentPrice|salePrice|offerPrice)["']\s*:\s*["']?(\d{1,5}(?:\.\d{1,2})?)/i);
      if (m) { price = num(m[1]); if (price) source = 'inline-json'; }
    }
    if (!price) {
      const m = html.match(/[$£€]\s?(\d{1,5}(?:\.\d{2})?)/);
      if (m) { price = num(m[1]); if (price) source = 'symbol'; }
    }
    res.status(200).json({ price, source });
  } catch (e) {
    res.status(200).json({ price: null, reason: String((e && e.message) || e) });
  }
};
