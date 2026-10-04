const crypto = require('crypto');
const express = require('express');
const config = require('../config');
const db = require('../lib/db');
const catalogue = require('../lib/catalogue');
const recommend = require('../lib/recommend');

const router = express.Router();

/* ---------- small helpers ---------- */

// Very basic in-memory rate limit. Good enough to stop form spam on a small site.
const hits = new Map();
function limit(maxHits, windowMs) {
  return (req, res, next) => {
    const key = req.ip + ' ' + req.path;
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= maxHits) {
      return res.status(429).json({ error: 'Too many requests. Please try again in a few minutes.' });
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [key, list] of hits) {
    if (!list.some((t) => now - t < 15 * 60 * 1000)) hits.delete(key);
  }
}, 10 * 60 * 1000).unref();

function clean(value, max, multiline) {
  let s = String(value == null ? '' : value);
  if (multiline) {
    s = s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  } else {
    s = s.replace(/[\u0000-\u001f\u007f]/g, ' ');
  }
  return s.trim().slice(0, max);
}

function csv(value) {
  return value ? String(value).split(',').map((x) => x.trim()).filter(Boolean) : [];
}

function sizeArea(size) {
  const d = catalogue.dims(size);
  return d[0] * d[1];
}

function uniqueSorted(list, sorter) {
  const arr = Array.from(new Set(list));
  return sorter ? arr.sort(sorter) : arr.sort();
}

/* ---------- config ---------- */

router.get('/config', (req, res) => {
  res.json({
    brand: config.brand,
    tagline: config.tagline,
    whatsapp: config.whatsapp,
    phone: config.phone,
    email: config.email,
    currency: config.currency
  });
});

/* ---------- products ---------- */

router.get('/products', (req, res) => {
  const q = req.query;
  const everything = catalogue.all();

  // Compare drawer asks for specific products by slug
  if (q.slugs) {
    const wanted = csv(q.slugs).slice(0, 3);
    const items = wanted.map((s) => everything.find((p) => p.slug === s)).filter(Boolean);
    return res.json({ total: items.length, offset: 0, limit: items.length, items, facets: null });
  }

  const inCategory = q.category ? everything.filter((p) => p.category === q.category) : everything;

  const categoryCounts = {};
  everything.forEach((p) => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  const facets = {
    sizes: uniqueSorted(inCategory.map((p) => p.size), (a, b) => sizeArea(a) - sizeArea(b)),
    colours: uniqueSorted(inCategory.map((p) => p.colour)),
    finishes: uniqueSorted(inCategory.map((p) => p.finish)),
    materials: uniqueSorted(inCategory.map((p) => p.material)),
    applications: uniqueSorted([].concat.apply([], inCategory.map((p) => p.application))),
    categories: categoryCounts
  };

  const search = String(q.q || '').trim().toLowerCase();
  const minPrice = Number(q.minPrice) || 0;
  const maxPrice = Number(q.maxPrice) || 0;

  let items = inCategory.filter((p) => {
    if (q.size && p.size !== q.size) return false;
    if (q.colour && p.colour !== q.colour) return false;
    if (q.finish && p.finish !== q.finish) return false;
    if (q.material && p.material !== q.material) return false;
    if (q.application && !p.application.includes(q.application)) return false;
    if (q.offer === '1' && !p.offerActive) return false;
    if (minPrice && p.effectivePrice < minPrice) return false;
    if (maxPrice && p.effectivePrice > maxPrice) return false;
    if (search) {
      const haystack = [p.name, p.category, p.colour, p.finish, p.material, p.size, p.description, p.application.join(' ')]
        .join(' ')
        .toLowerCase();
      // every word typed must appear somewhere
      if (!search.split(/\s+/).every((word) => haystack.includes(word))) return false;
    }
    return true;
  });

  const sorters = {
    'price-asc': (a, b) => a.effectivePrice - b.effectivePrice,
    'price-desc': (a, b) => b.effectivePrice - a.effectivePrice,
    newest: (a, b) => b.id - a.id,
    rating: (a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount,
    featured: (a, b) => Number(b.featured) - Number(a.featured) || a.id - b.id
  };
  items.sort(sorters[q.sort] || sorters.featured);

  const total = items.length;
  const offset = Math.max(parseInt(q.offset, 10) || 0, 0);
  const pageSize = Math.min(Math.max(parseInt(q.limit, 10) || 12, 1), 60);
  items = items.slice(offset, offset + pageSize);

  res.json({ total, offset, limit: pageSize, items, facets });
});

router.get('/products/:slug', (req, res) => {
  const product = catalogue.bySlug(req.params.slug);
  if (!product) return res.status(404).json({ error: 'We could not find that tile.' });

  const reviews = db
    .read('reviews')
    .filter((r) => r.productSlug === product.slug)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    breakdown[r.rating] += 1;
  });

  const related = catalogue
    .all()
    .filter((p) => p.slug !== product.slug)
    .map((p) => {
      let score = 0;
      if (p.category === product.category) score += 3;
      if (p.colour === product.colour) score += 2;
      if (p.material === product.material) score += 1;
      if (p.finish === product.finish) score += 1;
      return { p, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score || a.p.id - b.p.id)
    .slice(0, 4)
    .map((x) => x.p);

  res.json({
    product,
    reviews,
    summary: { average: product.avgRating, count: product.reviewCount, breakdown },
    related
  });
});

/* ---------- room guide ---------- */

router.get('/rooms', (req, res) => {
  res.json(recommend.listRooms());
});

router.get('/recommend', (req, res) => {
  const prefs = {
    colour: clean(req.query.colour, 30),
    maxPrice: Number(req.query.maxPrice) || 0
  };
  const result = recommend.recommend(String(req.query.room || ''), prefs, 4);
  if (!result) return res.status(404).json({ error: 'Unknown room.' });
  res.json(result);
});

/* ---------- reviews ---------- */

router.get('/reviews', (req, res) => {
  const names = {};
  db.read('products').forEach((p) => {
    names[p.slug] = p.name;
  });
  let list = db.read('reviews').slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (req.query.product) list = list.filter((r) => r.productSlug === req.query.product);
  const max = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  res.json(list.slice(0, max).map((r) => Object.assign({}, r, { productName: names[r.productSlug] || '' })));
});

router.post('/reviews', limit(5, 10 * 60 * 1000), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (b.website) return res.json({ ok: true }); // honeypot field, real people leave it empty

    const product = db.read('products').find((p) => p.slug === String(b.productSlug || ''));
    if (!product) return res.status(400).json({ error: 'That tile does not exist.' });

    const name = clean(b.name, 60);
    const title = clean(b.title, 80);
    const comment = clean(b.comment, 600, true);
    const rating = parseInt(b.rating, 10);

    if (name.length < 2) return res.status(400).json({ error: 'Please enter your name.' });
    if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Please choose a rating from 1 to 5.' });
    if (comment.length < 10) return res.status(400).json({ error: 'Please write at least a sentence or two (10 characters).' });

    const review = {
      id: db.nextId('reviews'),
      productSlug: product.slug,
      name,
      rating,
      title,
      comment,
      createdAt: new Date().toISOString()
    };
    db.read('reviews').push(review);
    await db.save('reviews');
    res.status(201).json({ ok: true, review });
  } catch (err) {
    next(err);
  }
});

/* ---------- stores ---------- */

router.get('/stores', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  let stores = db.read('stores');
  if (q) {
    stores = stores.filter((s) => [s.name, s.city, s.state, s.pincode, s.address].join(' ').toLowerCase().includes(q));
  }
  res.json(stores);
});

/* ---------- enquiries ---------- */

const ENQUIRY_TYPES = ['quote', 'help', 'bulk', 'other'];
const CUSTOMER_TYPES = ['Homeowner', 'Architect / Interior designer', 'Builder / Contractor', 'Dealer / Retailer', 'Other'];

router.post('/enquiries', limit(5, 10 * 60 * 1000), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (b.website) return res.json({ ok: true, reference: 'FX-0000' }); // honeypot

    const name = clean(b.name, 80);
    const phone = clean(b.phone, 20);
    const email = clean(b.email, 120);
    const city = clean(b.city, 60);
    const message = clean(b.message, 1000, true);
    const digits = phone.replace(/\D/g, '');

    if (name.length < 2) return res.status(400).json({ error: 'Please enter your name.' });
    if (digits.length < 10 || digits.length > 13) {
      return res.status(400).json({ error: 'Please enter a phone number with 10 digits (country code is fine).' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ error: 'That email address does not look right.' });
    }
    if (message.length < 5) return res.status(400).json({ error: 'Please tell us a little about what you need.' });

    let area = null;
    if (b.areaSqm !== undefined && b.areaSqm !== '' && b.areaSqm !== null) {
      area = Number(b.areaSqm);
      if (!(area > 0 && area <= 100000)) {
        return res.status(400).json({ error: 'Area should be a number of square metres.' });
      }
    }

    const product = b.productSlug ? db.read('products').find((p) => p.slug === String(b.productSlug)) : null;
    const type = ENQUIRY_TYPES.includes(b.type) ? b.type : 'quote';
    const customerType = CUSTOMER_TYPES.includes(b.customerType) ? b.customerType : '';

    const id = db.nextId('enquiries');
    const enquiry = {
      id,
      reference: 'FX-' + String(id).padStart(4, '0'),
      createdAt: new Date().toISOString(),
      status: 'new',
      type,
      name,
      phone,
      email,
      city,
      customerType,
      productSlug: product ? product.slug : '',
      productName: product ? product.name : '',
      areaSqm: area,
      message
    };

    db.read('enquiries').push(enquiry);
    await db.save('enquiries');
    res.status(201).json({ ok: true, reference: enquiry.reference });
  } catch (err) {
    next(err);
  }
});

/* ---------- admin ---------- */

function requireAdmin(req, res, next) {
  const given = Buffer.from(String(req.get('x-admin-key') || ''));
  const real = Buffer.from(config.adminKey);
  const ok = given.length === real.length && crypto.timingSafeEqual(given, real);
  if (!ok) return res.status(401).json({ error: 'Wrong admin key.' });
  next();
}

router.get('/admin/enquiries', requireAdmin, (req, res) => {
  const list = db.read('enquiries').slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json(list);
});

router.patch('/admin/enquiries/:id', requireAdmin, async (req, res, next) => {
  try {
    const item = db.read('enquiries').find((e) => e.id === Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Enquiry not found.' });
    if (!['new', 'contacted', 'closed'].includes(req.body.status)) {
      return res.status(400).json({ error: 'Status must be new, contacted or closed.' });
    }
    item.status = req.body.status;
    await db.save('enquiries');
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.get('/admin/reviews', requireAdmin, (req, res) => {
  res.json(db.read('reviews').slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
});

router.delete('/admin/reviews/:id', requireAdmin, async (req, res, next) => {
  try {
    const list = db.read('reviews');
    const index = list.findIndex((r) => r.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Review not found.' });
    list.splice(index, 1);
    await db.save('reviews');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

module.exports = router;
