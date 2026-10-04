/*
  main.js - code every page uses:
  helpers, product cards, the compare tray and the enquiry form.
  Page-specific scripts (catalogue.js, product.js ...) build on FX.
*/
(function () {
  'use strict';

  var FX = (window.FX = {
    config: { brand: 'Fixton Tiles', currency: '\u20B9', whatsapp: '', phone: '', email: '' }
  });

  /* ---------- helpers ---------- */

  FX.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  FX.money = function (n) {
    return FX.config.currency + Number(n).toLocaleString('en-IN');
  };

  FX.date = function (iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  FX.stars = function (n) {
    var full = Math.round(n);
    return '\u2605'.repeat(full) + '\u2606'.repeat(5 - full);
  };

  FX.debounce = function (fn, ms) {
    var t;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  };

  FX.api = function (url, options) {
    return fetch(url, options).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) throw new Error((data && data.error) || 'Something went wrong. Please try again.');
        return data;
      });
    });
  };

  FX.waLink = function (text) {
    var url = 'https://wa.me/' + FX.config.whatsapp;
    return text ? url + '?text=' + encodeURIComponent(text) : url;
  };

  FX.ready = FX.api('/api/config').then(function (c) {
    FX.config = c;
    return c;
  }).catch(function () {
    return FX.config;
  });

  FX.category = {
    floor: 'Floor tiles', wall: 'Wall tiles', bathroom: 'Bathroom tiles', kitchen: 'Kitchen tiles', outdoor: 'Outdoor tiles'
  };

  FX.art = function (product, view, extraClass) {
    var svg = window.TileArt ? window.TileArt.svg(product, view) : '';
    return '<div class="art ' + (extraClass || '') + '">' + svg + '</div>';
  };

  /* ---------- product card ---------- */

  FX.card = function (p, options) {
    options = options || {};
    var url = '/product/' + encodeURIComponent(p.slug);
    var price = p.offerActive
      ? '<del>' + FX.money(p.price) + '</del>' + FX.money(p.effectivePrice)
      : FX.money(p.price);
    var rating = p.reviewCount
      ? '<p class="rating" aria-label="Rated ' + p.avgRating + ' out of 5">' + FX.stars(p.avgRating) + '<span>' + p.avgRating + ' (' + p.reviewCount + ')</span></p>'
      : '';
    var reasons = options.reasons && options.reasons.length
      ? '<ul class="why">' + options.reasons.map(function (r) { return '<li>' + FX.esc(r) + '</li>'; }).join('') + '</ul>'
      : '';

    return '<article class="card">' +
      (p.offerActive ? '<span class="badge">' + p.offerPercent + '% off</span>' : '') +
      '<a class="card-img" href="' + url + '" tabindex="-1" aria-hidden="true">' + FX.art(p, 'card') + '</a>' +
      '<div class="card-body">' +
        '<p class="card-meta">' + FX.esc(FX.category[p.category] || p.category) + ' &middot; ' + FX.esc(p.size) + '</p>' +
        '<h3><a href="' + url + '">' + FX.esc(p.name) + '</a></h3>' +
        '<p class="card-spec">' + FX.esc(p.finish) + ' &middot; ' + FX.esc(p.material) + ' &middot; ' + FX.esc(p.colour) + '</p>' +
        rating +
        '<div class="card-foot">' +
          '<p class="price">' + price + ' <small>/ sqm</small></p>' +
          '<button type="button" class="cmp" data-slug="' + FX.esc(p.slug) + '" data-name="' + FX.esc(p.name) + '" aria-pressed="false">Compare</button>' +
        '</div>' +
        reasons +
      '</div>' +
    '</article>';
  };

  /* ---------- compare tray ---------- */

  var KEY = 'fx_compare';
  var MAX = 3;

  function loadCompare() {
    try {
      var list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list.slice(0, MAX) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCompare(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* private mode - just keep going */ }
  }

  var picked = loadCompare();
  var names = {};

  FX.compare = {
    sync: function () {
      document.querySelectorAll('.cmp').forEach(function (btn) {
        var on = picked.indexOf(btn.dataset.slug) !== -1;
        names[btn.dataset.slug] = btn.dataset.name || names[btn.dataset.slug];
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.textContent = on ? 'Added' : 'Compare';
      });
      var tray = document.getElementById('compare-tray');
      if (!tray) return;
      tray.hidden = picked.length === 0;
      document.body.classList.toggle('has-tray', picked.length > 0);
      var label = picked.map(function (s) { return '<strong>' + FX.esc(names[s] || s.replace(/-/g, ' ')) + '</strong>'; }).join(', ');
      document.getElementById('compare-names').innerHTML = 'Comparing ' + picked.length + ' of ' + MAX + ': ' + label;
      document.getElementById('compare-open').disabled = picked.length < 2;
    },

    toggle: function (slug, name) {
      var i = picked.indexOf(slug);
      if (name) names[slug] = name;
      if (i !== -1) {
        picked.splice(i, 1);
      } else {
        if (picked.length >= MAX) {
          alert('You can compare up to ' + MAX + ' tiles at a time. Remove one first.');
          return;
        }
        picked.push(slug);
      }
      saveCompare(picked);
      FX.compare.sync();
    },

    clear: function () {
      picked = [];
      saveCompare(picked);
      FX.compare.sync();
    },

    open: function () {
      var dialog = document.getElementById('compare-dialog');
      var body = document.getElementById('compare-body');
      body.innerHTML = '<p class="muted">Loading...</p>';
      dialog.showModal();
      FX.api('/api/products?slugs=' + encodeURIComponent(picked.join(','))).then(function (data) {
        var items = data.items;
        if (!items.length) {
          body.innerHTML = '<p class="muted">Those tiles are no longer available.</p>';
          return;
        }
        var rows = [
          ['Category', function (p) { return FX.esc(FX.category[p.category] || p.category); }],
          ['Size', function (p) { return FX.esc(p.size); }],
          ['Colour', function (p) { return FX.esc(p.colour); }],
          ['Finish', function (p) { return FX.esc(p.finish); }],
          ['Material', function (p) { return FX.esc(p.material); }],
          ['Thickness', function (p) { return p.thickness + ' mm'; }],
          ['Best for', function (p) { return FX.esc(p.application.join(', ')); }],
          ['Price / sqm', function (p) { return p.offerActive ? '<del>' + FX.money(p.price) + '</del> ' + FX.money(p.effectivePrice) : FX.money(p.price); }],
          ['Rating', function (p) { return p.reviewCount ? p.avgRating + ' / 5 (' + p.reviewCount + ')' : 'No reviews yet'; }]
        ];
        var html = '<table class="compare-table"><thead><tr><th></th>' + items.map(function (p) {
          return '<th scope="col" style="color:var(--text)">' + FX.art(p, 'card') + '<a href="/product/' + encodeURIComponent(p.slug) + '">' + FX.esc(p.name) + '</a></th>';
        }).join('') + '</tr></thead><tbody>';
        rows.forEach(function (row) {
          html += '<tr><th scope="row">' + row[0] + '</th>' + items.map(function (p) { return '<td>' + row[1](p) + '</td>'; }).join('') + '</tr>';
        });
        body.innerHTML = html + '</tbody></table>';
      }).catch(function (err) {
        body.innerHTML = '<p class="muted">' + FX.esc(err.message) + '</p>';
      });
    }
  };

  /* ---------- enquiry form (used on /contact and the product page) ---------- */

  FX.bindEnquiryForm = function (form, options) {
    options = options || {};
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');

    function setStatus(text, kind) {
      status.textContent = text;
      status.className = 'form-status' + (kind ? ' ' + kind : '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setStatus('', '');

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var data = {};
      new FormData(form).forEach(function (value, key) { data[key] = value; });
      if (options.productSlug) data.productSlug = options.productSlug;

      button.disabled = true;
      var oldLabel = button.textContent;
      button.textContent = 'Sending...';

      FX.api('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (result) {
        var lines = ['Hi, I just sent an enquiry on your website (ref ' + result.reference + ').'];
        if (options.productName) lines.push('Tile: ' + options.productName);
        if (data.areaSqm) lines.push('Area: ' + data.areaSqm + ' sqm');
        lines.push('Name: ' + data.name);
        var box = document.createElement('div');
        box.className = 'success';
        box.setAttribute('role', 'status');
        box.innerHTML = '<h3>Thank you, we have your enquiry</h3>' +
          '<p>Your reference is <strong>' + FX.esc(result.reference) + '</strong>. Someone from our sales team will call you on <strong>' + FX.esc(data.phone) + '</strong> soon.</p>' +
          '<p>Want a faster reply? You can also continue on WhatsApp.</p>' +
          '<a class="btn" href="' + FX.esc(FX.waLink(lines.join('\n'))) + '" target="_blank" rel="noopener">Continue on WhatsApp</a>';
        form.replaceWith(box);
        if (options.onSuccess) options.onSuccess(box);
        box.scrollIntoView({ block: 'nearest' });
      }).catch(function (err) {
        setStatus(err.message, 'err');
        button.disabled = false;
        button.textContent = oldLabel;
      });
    });
  };

  /* ---------- page wiring ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    // active nav link
    var page = document.body.dataset.page;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.dataset.nav === page) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });

    // mobile menu
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    // whatsapp links get the number once config is loaded
    FX.ready.then(function () {
      document.querySelectorAll('[data-wa]').forEach(function (a) {
        a.href = FX.waLink(a.dataset.waText || '');
        a.target = '_blank';
        a.rel = 'noopener';
      });
    });

    // compare buttons (delegated, because cards are added after load)
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.cmp');
      if (btn) FX.compare.toggle(btn.dataset.slug, btn.dataset.name);
    });
    document.getElementById('compare-open').addEventListener('click', FX.compare.open);
    document.getElementById('compare-clear').addEventListener('click', FX.compare.clear);

    // dialogs: close button and click on the dark backdrop
    document.querySelectorAll('dialog').forEach(function (d) {
      d.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('[data-close]')) return d.close();
        if (e.target !== d) return;
        // a click on the dialog element itself is either its padding or the backdrop
        var r = d.getBoundingClientRect();
        var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) d.close();
      });
    });

    FX.compare.sync();
  });
})();
