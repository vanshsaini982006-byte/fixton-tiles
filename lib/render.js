// Very small template layer. HTML files in /views use a few {{tokens}}
// for the shared header/footer, and the server fills in titles and
// structured data so search engines get proper HTML.

const fs = require('fs');
const path = require('path');
const config = require('../config');
const db = require('./db');

const VIEWS = path.join(__dirname, '..', 'views');

function read(file) {
  return fs.readFileSync(path.join(VIEWS, file), 'utf8');
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// JSON inside a <script> tag must not contain a literal "<"
function ld(obj) {
  const json = JSON.stringify(obj).replace(/</g, '\\u003c');
  return '<script type="application/ld+json">' + json + '</script>';
}

function page(name, opts) {
  opts = opts || {};
  let html = read(name + '.html');

  const parts = {
    head: 'partials/head.html',
    header: 'partials/header.html',
    footer: 'partials/footer.html',
    scripts: 'partials/scripts.html',
    enquiryFields: 'partials/enquiry-fields.html'
  };
  Object.keys(parts).forEach((key) => {
    const content = read(parts[key]);
    html = html.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), () => content);
  });

  const tokens = {
    brand: esc(config.brand),
    tagline: esc(config.tagline),
    phone: esc(config.phone),
    phoneTel: esc(config.phone.replace(/[^\d+]/g, '')),
    email: esc(config.email)
  };
  Object.keys(tokens).forEach((key) => {
    html = html.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), () => tokens[key]);
  });

  if (opts.title) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + esc(opts.title) + '</title>');
  }
  if (opts.description) {
    html = html.replace(
      /<meta name="description" content="[^"]*">/,
      () => '<meta name="description" content="' + esc(opts.description) + '">'
    );
  }
  html = html.replace('<!--head-extra-->', () => opts.headExtra || '');
  return html;
}

function productHead(p, reviews) {
  const url = config.siteUrl + '/product/' + p.slug;
  const title = p.name + ' ' + p.size + ' ' + p.finish + ' ' + p.material + ' Tile | ' + config.brand;
  const description = p.name + ' - ' + p.finish.toLowerCase() + ' ' + p.material.toLowerCase() +
    ' tile, ' + p.size + '. ' + p.description;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.sku,
    category: p.category + ' tiles',
    description: p.description,
    brand: { '@type': 'Brand', name: config.brand },
    offers: {
      '@type': 'Offer',
      url: url,
      priceCurrency: 'INR',
      price: p.effectivePrice,
      availability: 'https://schema.org/InStock'
    }
  };
  if (reviews.length) {
    const sum = reviews.reduce((t, r) => t + r.rating, 0);
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: (sum / reviews.length).toFixed(1),
      reviewCount: reviews.length
    };
  }

  const extra = [
    '<link rel="canonical" href="' + esc(url) + '">',
    '<meta property="og:type" content="product">',
    '<meta property="og:title" content="' + esc(title) + '">',
    '<meta property="og:description" content="' + esc(description) + '">',
    '<meta property="og:url" content="' + esc(url) + '">',
    ld(schema)
  ].join('\n');

  return { title, description, headExtra: extra };
}

function homeHead() {
  const stores = db.read('stores');
  const head = stores[0];
  if (!head) return {};
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HomeGoodsStore',
    name: config.brand,
    url: config.siteUrl,
    telephone: config.phone,
    email: config.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: head.address,
      addressLocality: head.city,
      addressRegion: head.state,
      postalCode: head.pincode,
      addressCountry: 'IN'
    },
    geo: { '@type': 'GeoCoordinates', latitude: head.lat, longitude: head.lng },
    openingHours: head.hoursSchema || 'Mo-Sa 10:00-19:00'
  };
  return { headExtra: '<link rel="canonical" href="' + esc(config.siteUrl) + '/">\n' + ld(schema) };
}

module.exports = { page, productHead, homeHead, esc };
