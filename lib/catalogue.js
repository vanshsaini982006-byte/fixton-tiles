const db = require('./db');

function today() {
  return new Date().toISOString().slice(0, 10);
}

// "600 x 1200 mm" -> [600, 1200]
function dims(size) {
  const m = /(\d+)\s*x\s*(\d+)/i.exec(size || '');
  return m ? [Number(m[1]), Number(m[2])] : [600, 600];
}

function offerActive(p) {
  return !!p.offerPercent && (!p.offerEnds || p.offerEnds >= today());
}

function effectivePrice(p) {
  if (!offerActive(p)) return p.price;
  return Math.round((p.price * (100 - p.offerPercent)) / 100);
}

function ratingMap() {
  const map = {};
  for (const r of db.read('reviews')) {
    const m = map[r.productSlug] || (map[r.productSlug] = { sum: 0, count: 0 });
    m.sum += r.rating;
    m.count += 1;
  }
  return map;
}

// Adds the computed fields the front end needs (offer price, rating)
function decorate(p, rmap) {
  const r = (rmap || ratingMap())[p.slug];
  return Object.assign({}, p, {
    offerActive: offerActive(p),
    effectivePrice: effectivePrice(p),
    reviewCount: r ? r.count : 0,
    avgRating: r ? Math.round((r.sum / r.count) * 10) / 10 : 0
  });
}

function all() {
  const rmap = ratingMap();
  return db.read('products').map((p) => decorate(p, rmap));
}

function bySlug(slug) {
  const p = db.read('products').find((x) => x.slug === slug);
  return p ? decorate(p) : null;
}

module.exports = { all, bySlug, decorate, dims, offerActive, effectivePrice };
