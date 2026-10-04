const path = require('path');
const express = require('express');
const config = require('./config');
const db = require('./lib/db');
const catalogue = require('./lib/catalogue');
const render = require('./lib/render');
const api = require('./routes/api');

const app = express();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: '20kb' }));

/* ---------- API ---------- */
app.use('/api', api);

/* ---------- static files ---------- */
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

/* ---------- pages ---------- */
const pages = {
  '/catalogue': 'catalogue',
  '/rooms': 'rooms',
  '/offers': 'offers',
  '/stores': 'stores',
  '/about': 'about',
  '/contact': 'contact',
  '/admin': 'admin'
};

app.get('/', (req, res) => {
  res.send(render.page('index', render.homeHead()));
});

Object.keys(pages).forEach((route) => {
  app.get(route, (req, res) => {
    res.send(render.page(pages[route]));
  });
});

app.get('/product/:slug', (req, res) => {
  const product = catalogue.bySlug(req.params.slug);
  if (!product) {
    return res.status(404).send(render.page('404', { title: 'Tile not found | ' + config.brand }));
  }
  const reviews = db.read('reviews').filter((r) => r.productSlug === product.slug);
  res.send(render.page('product', render.productHead(product, reviews)));
});

/* ---------- SEO files ---------- */
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ' + config.siteUrl + '/sitemap.xml\n');
});

app.get('/sitemap.xml', (req, res) => {
  const urls = ['/', '/catalogue', '/rooms', '/offers', '/stores', '/about', '/contact'];
  db.read('products').forEach((p) => urls.push('/product/' + p.slug));
  const body = urls.map((u) => '  <url><loc>' + config.siteUrl + u + '</loc></url>').join('\n');
  res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + '\n</urlset>\n');
});

/* ---------- 404 and errors ---------- */
app.use((req, res) => {
  res.status(404).send(render.page('404', { title: 'Page not found | ' + config.brand }));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  }
  res.status(500).send('Something went wrong. Please try again in a moment.');
});

app.listen(config.port, () => {
  console.log(config.brand + ' running at http://localhost:' + config.port);
  if (config.adminKey === 'fixton-admin') {
    console.log('Note: the admin page is using the default key. Set ADMIN_KEY before you put this online.');
  }
});
