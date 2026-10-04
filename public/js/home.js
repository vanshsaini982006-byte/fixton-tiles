(function () {
  'use strict';

  var ROOM_LABELS = {};

  FX.ready.then(function () {
    return Promise.all([
      FX.api('/api/products?limit=60'),
      FX.api('/api/rooms'),
      FX.api('/api/reviews?limit=3')
    ]);
  }).then(function (results) {
    var products = results[0].items;
    var counts = results[0].facets.categories;
    var rooms = results[1];
    var reviews = results[2];

    // hero: a big laid-out sample of one featured tile
    var featured = products.filter(function (p) { return p.featured; });
    var heroTile = featured[1] || featured[0] || products[0];
    if (heroTile) {
      document.getElementById('hero-art').innerHTML = window.TileArt.svg(heroTile, 'wide');
      document.getElementById('hero-note').innerHTML =
        'Shown: <a href="/product/' + FX.esc(heroTile.slug) + '">' + FX.esc(heroTile.name) + '</a>, ' + FX.esc(heroTile.size);
    }

    // category strip: first product in each category as the picture
    var catHtml = '';
    Object.keys(FX.category).forEach(function (key) {
      var sample = products.find(function (p) { return p.category === key; });
      if (!sample) return;
      catHtml += '<a class="cat" href="/catalogue?category=' + key + '">' +
        FX.art(sample, 'card') +
        '<span>' + FX.esc(FX.category[key]) + ' <small style="color:var(--muted);font-family:var(--body)">(' + (counts[key] || 0) + ')</small></span></a>';
    });
    document.getElementById('cats').innerHTML = catHtml;

    document.getElementById('featured').innerHTML = featured.slice(0, 6).map(function (p) { return FX.card(p); }).join('');

    var deals = products.filter(function (p) { return p.offerActive; }).slice(0, 3);
    if (deals.length) {
      document.getElementById('offers').innerHTML = deals.map(function (p) { return FX.card(p); }).join('');
      document.getElementById('offers-section').hidden = false;
    }

    document.getElementById('room-links').innerHTML = rooms.map(function (r) {
      ROOM_LABELS[r.id] = r.label;
      return '<a class="room-btn" href="/rooms?room=' + encodeURIComponent(r.id) + '">' + FX.esc(r.label) + '</a>';
    }).join('');

    if (reviews.length) {
      document.getElementById('home-reviews').innerHTML = reviews.map(function (r) {
        return '<article class="review" style="border:1px solid var(--line);background:var(--panel);padding:20px">' +
          '<span class="rating">' + FX.stars(r.rating) + '</span>' +
          '<h4>' + FX.esc(r.title || 'Customer review') + '</h4>' +
          '<p>' + FX.esc(r.comment) + '</p>' +
          '<small>' + FX.esc(r.name) + ' on <a href="/product/' + FX.esc(r.productSlug) + '">' + FX.esc(r.productName) + '</a></small>' +
          '</article>';
      }).join('');
      document.getElementById('reviews-section').hidden = false;
    }

    FX.compare.sync();
  }).catch(function (err) {
    document.getElementById('featured').innerHTML = '<div class="notice">Could not load the tiles right now. ' + FX.esc(err.message) + '</div>';
  });
})();
