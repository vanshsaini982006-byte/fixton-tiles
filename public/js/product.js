(function () {
  'use strict';

  var slug = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
  var product = null;
  var VIEWS = [
    { id: 'face', label: 'Tile' },
    { id: 'close', label: 'Close-up' },
    { id: 'layout', label: 'Laid out' },
    { id: 'wide', label: 'Wide' }
  ];

  function render(data) {
    product = data.product;
    var p = product;

    document.getElementById('crumb-cat').innerHTML = '<a href="/catalogue?category=' + encodeURIComponent(p.category) + '">' + FX.esc(FX.category[p.category] || p.category) + '</a>';
    document.getElementById('crumb-name').textContent = p.name;

    var price = p.offerActive
      ? '<strong>' + FX.money(p.effectivePrice) + '</strong><del>' + FX.money(p.price) + '</del><span class="save">Save ' + p.offerPercent + '%</span>'
      : '<strong>' + FX.money(p.price) + '</strong>';
    var offerEnd = p.offerActive && p.offerEnds ? '<p class="offer-end">Offer price valid until ' + FX.esc(FX.date(p.offerEnds)) + '. Price is per square metre.</p>' : '<p class="offer-end">Price is per square metre, before delivery and fitting.</p>';

    var specs = [
      ['Size', p.size],
      ['Colour', p.colour],
      ['Finish', p.finish],
      ['Material', p.material],
      ['Best for', p.application.join(', ')],
      ['Thickness', p.thickness + ' mm'],
      ['Pieces per box', p.piecesPerBox],
      ['Coverage per box', p.coveragePerBox + ' sqm'],
      ['Product code', p.sku]
    ].map(function (r) { return '<tr><th scope="row">' + r[0] + '</th><td>' + FX.esc(r[1]) + '</td></tr>'; }).join('');

    var thumbs = VIEWS.map(function (v, i) {
      return '<button type="button" class="thumb' + (i === 0 ? ' on' : '') + '" data-view="' + v.id + '" aria-label="Show ' + v.label + ' view">' + FX.art(p, v.id) + '<span>' + v.label + '</span></button>';
    }).join('');

    document.getElementById('product').innerHTML =
      '<div class="pdp">' +
        '<div class="gallery"><div class="art main" id="main-art">' + window.TileArt.svg(p, 'face') + '</div><div class="thumbs" id="thumbs">' + thumbs + '</div>' +
        '<p class="muted" style="font-size:.8rem;margin-top:10px">Swatches are drawn to show pattern and finish. Colours on screen can differ from the real tile, so please see a sample in a showroom before ordering.</p></div>' +
        '<div class="pdp-info">' +
          '<p class="eyebrow">' + FX.esc(FX.category[p.category] || p.category) + '</p>' +
          '<h1>' + FX.esc(p.name) + '</h1>' +
          (p.reviewCount ? '<p class="rating">' + FX.stars(p.avgRating) + '<span>' + p.avgRating + ' from ' + p.reviewCount + ' review' + (p.reviewCount > 1 ? 's' : '') + '</span></p>' : '<p class="muted">No reviews yet</p>') +
          '<div class="pdp-price">' + price + '<span class="muted">/ sqm</span></div>' + offerEnd +
          '<p class="pdp-desc">' + FX.esc(p.description) + '</p>' +
          '<div class="pdp-btns">' +
            '<button type="button" class="btn" id="quote-btn">Get a quote</button>' +
            '<a class="btn btn-ghost" id="wa-btn" href="#" target="_blank" rel="noopener">Ask on WhatsApp</a>' +
            '<button type="button" class="cmp" data-slug="' + FX.esc(p.slug) + '" data-name="' + FX.esc(p.name) + '">Compare</button>' +
          '</div>' +
          '<table class="specs"><tbody>' + specs + '</tbody></table>' +
          '<div class="calc"><h3>How much do I need?</h3><p>Enter the floor or wall area and we will add 10% for cuts and breakage.</p>' +
            '<div class="calc-row"><div><label class="field-label" for="calc-area">Area (sqm)</label><input id="calc-area" type="number" min="0.1" step="any" inputmode="decimal" placeholder="e.g. 25"></div></div>' +
            '<div class="calc-out" id="calc-out" aria-live="polite"></div></div>' +
        '</div>' +
      '</div>';

    // gallery
    document.getElementById('thumbs').addEventListener('click', function (e) {
      var btn = e.target.closest('.thumb');
      if (!btn) return;
      document.querySelectorAll('.thumb').forEach(function (t) { t.classList.toggle('on', t === btn); });
      document.getElementById('main-art').innerHTML = window.TileArt.svg(p, btn.dataset.view);
    });

    // quote dialog
    var dialog = document.getElementById('quote-dialog');
    document.getElementById('quote-for').textContent = 'Tile: ' + p.name + ' (' + p.size + '), ' + p.sku;
    document.getElementById('quote-btn').addEventListener('click', function () { dialog.showModal(); });
    FX.bindEnquiryForm(document.getElementById('quote-form'), { productSlug: p.slug, productName: p.name });

    // whatsapp
    FX.ready.then(function () {
      document.getElementById('wa-btn').href = FX.waLink('Hi, I would like a quote for ' + p.name + ' (' + p.sku + '), ' + p.size + '. Please share price and availability.');
    });

    // quantity calculator
    var tileArea = (p.coveragePerBox / p.piecesPerBox);
    document.getElementById('calc-area').addEventListener('input', function (e) {
      var area = parseFloat(e.target.value);
      var out = document.getElementById('calc-out');
      if (!(area > 0)) { out.innerHTML = ''; return; }
      var need = area * 1.1;
      var boxes = Math.ceil(need / p.coveragePerBox);
      var pieces = boxes * p.piecesPerBox;
      var covers = (pieces * tileArea).toFixed(2);
      var cost = Math.round(boxes * p.coveragePerBox * p.effectivePrice);
      out.innerHTML = 'You need about <strong>' + boxes + ' box' + (boxes > 1 ? 'es' : '') + '</strong> (' + pieces + ' tiles, covering ' + covers + ' sqm).' +
        '<br>Estimated tile cost: <strong>' + FX.money(cost) + '</strong>' +
        '<span class="tiny">Estimate only. Delivery, fitting and grout are not included. Tell us the exact area in your quote request.</span>';
      var field = document.getElementById('quote-form') && document.getElementById('e-area');
      if (field && !field.value) field.value = area;
    });

    // reviews
    var s = data.summary;
    var rows = [5, 4, 3, 2, 1].map(function (n) {
      var pct = s.count ? Math.round((s.breakdown[n] / s.count) * 100) : 0;
      return '<div class="bar-row"><span>' + n + '</span><div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div><span>' + s.breakdown[n] + '</span></div>';
    }).join('');
    document.getElementById('review-summary').innerHTML = s.count
      ? '<div class="score">' + s.average + '</div><p class="rating">' + FX.stars(s.average) + '<span>' + s.count + ' review' + (s.count > 1 ? 's' : '') + '</span></p><div class="bars">' + rows + '</div>'
      : '<p class="muted">Nobody has reviewed this tile yet. Bought it? Be the first.</p>';
    drawReviews(data.reviews);

    if (data.related.length) {
      document.getElementById('related').innerHTML = data.related.map(function (r) { return FX.card(r); }).join('');
      document.getElementById('related-section').hidden = false;
    }
    FX.compare.sync();
  }

  function drawReviews(list) {
    document.getElementById('review-list').innerHTML = list.map(function (r) {
      return '<article class="review"><span class="rating">' + FX.stars(r.rating) + '</span>' +
        (r.title ? '<h4>' + FX.esc(r.title) + '</h4>' : '') +
        '<p>' + FX.esc(r.comment) + '</p><small>' + FX.esc(r.name) + ', ' + FX.esc(FX.date(r.createdAt)) + '</small></article>';
    }).join('');
  }

  function bindReviewForm() {
    var form = document.getElementById('review-form');
    var status = document.getElementById('review-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'form-status';
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.productSlug = slug;
      if (!data.rating) { status.textContent = 'Please choose a rating.'; status.className = 'form-status err'; return; }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      FX.api('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function () {
          // reload so the average, bars and list all update together
          return FX.api('/api/products/' + encodeURIComponent(slug));
        }).then(function (fresh) {
          var s = fresh.summary;
          drawReviews(fresh.reviews);
          document.getElementById('review-summary').innerHTML = '<div class="score">' + s.average + '</div><p class="rating">' + FX.stars(s.average) + '<span>' + s.count + ' review' + (s.count > 1 ? 's' : '') + '</span></p>';
          form.reset();
          status.textContent = 'Thanks, your review is up.';
          status.className = 'form-status ok';
          btn.disabled = false;
        }).catch(function (err) {
          status.textContent = err.message;
          status.className = 'form-status err';
          btn.disabled = false;
        });
    });
  }

  FX.ready.then(function () {
    return FX.api('/api/products/' + encodeURIComponent(slug));
  }).then(function (data) {
    render(data);
    bindReviewForm();
  }).catch(function (err) {
    document.getElementById('product').innerHTML = '<div class="empty" style="margin:30px 0"><h3>We could not load this tile</h3><p>' + FX.esc(err.message) + '</p><a class="btn btn-ghost btn-sm" href="/catalogue">Back to collections</a></div>';
  });
})();
