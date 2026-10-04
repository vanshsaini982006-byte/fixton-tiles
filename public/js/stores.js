(function () {
  'use strict';

  var stores = [];
  var selected = null;
  var origin = null; // set when the visitor shares their location
  var listEl = document.getElementById('store-list');
  var searchEl = document.getElementById('store-search');
  var statusEl = document.getElementById('near-status');

  // straight-line distance in km (haversine)
  function km(a, b) {
    var R = 6371;
    var rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad;
    var dLng = (b.lng - a.lng) * rad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function drawList() {
    if (!stores.length) {
      listEl.innerHTML = '<div class="empty"><h3>No store found</h3><p>We do not have a store in that area yet. Send us an enquiry and we will arrange delivery.</p><a class="btn btn-ghost btn-sm" href="/contact">Contact us</a></div>';
      return;
    }
    listEl.innerHTML = stores.map(function (s) {
      var dist = origin ? '<p class="dist">About ' + Math.round(km(origin, s)) + ' km away (straight line)</p>' : '';
      return '<button type="button" class="store' + (selected && selected.id === s.id ? ' on' : '') + '" data-id="' + s.id + '">' +
        '<span class="tag">' + FX.esc(s.type) + '</span>' +
        '<h3>' + FX.esc(s.name) + '</h3>' +
        '<p>' + FX.esc(s.address) + ', ' + FX.esc(s.city) + ' ' + FX.esc(s.pincode) + '</p>' + dist +
        '</button>';
    }).join('');
  }

  function drawMap() {
    var box = document.getElementById('map-box');
    if (!selected) { box.hidden = true; return; }
    box.hidden = false;
    var s = selected;
    var dx = 0.012;
    var dy = 0.007;
    document.getElementById('map').src = 'https://www.openstreetmap.org/export/embed.html?bbox=' +
      [s.lng - dx, s.lat - dy, s.lng + dx, s.lat + dy].join('%2C') + '&layer=mapnik&marker=' + s.lat + '%2C' + s.lng;

    var dir = 'https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng;
    var big = 'https://www.openstreetmap.org/?mlat=' + s.lat + '&mlon=' + s.lng + '#map=16/' + s.lat + '/' + s.lng;
    var tel = s.phone.replace(/[^\d+]/g, '');
    document.getElementById('map-info').innerHTML =
      '<h3>' + FX.esc(s.name) + '</h3>' +
      '<p>' + FX.esc(s.address) + ', ' + FX.esc(s.city) + ', ' + FX.esc(s.state) + ' ' + FX.esc(s.pincode) + '</p>' +
      '<p>' + FX.esc(s.hours) + '</p>' +
      '<p>Phone: <a href="tel:' + FX.esc(tel) + '" style="color:var(--gold)">' + FX.esc(s.phone) + '</a></p>' +
      '<div class="map-links">' +
        '<a class="btn btn-sm" href="' + FX.esc(dir) + '" target="_blank" rel="noopener">Get directions</a>' +
        '<a class="btn btn-ghost btn-sm" href="' + FX.esc(big) + '" target="_blank" rel="noopener">Larger map</a>' +
        '<a class="btn btn-ghost btn-sm" href="' + FX.esc(FX.waLink('Hi, I would like to visit the ' + s.city + ' store. What time is best?')) + '" target="_blank" rel="noopener">WhatsApp</a>' +
      '</div>';
  }

  function select(store) {
    selected = store;
    drawList();
    drawMap();
  }

  function load() {
    var q = searchEl.value.trim();
    FX.api('/api/stores?q=' + encodeURIComponent(q)).then(function (list) {
      stores = list;
      if (origin) stores.sort(function (a, b) { return km(origin, a) - km(origin, b); });
      if (!selected || !stores.some(function (s) { return s.id === selected.id; })) selected = stores[0] || null;
      drawList();
      drawMap();
    }).catch(function (err) {
      listEl.innerHTML = '<div class="notice">' + FX.esc(err.message) + '</div>';
    });
  }

  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.store');
    if (!btn) return;
    select(stores.find(function (s) { return String(s.id) === btn.dataset.id; }));
  });

  searchEl.addEventListener('input', FX.debounce(function () {
    origin = null;
    statusEl.textContent = '';
    load();
  }, 250));

  document.getElementById('near-me').addEventListener('click', function () {
    if (!navigator.geolocation) {
      statusEl.textContent = 'Your browser cannot share location. Search by city instead.';
      statusEl.className = 'form-status err';
      return;
    }
    statusEl.textContent = 'Finding your location...';
    statusEl.className = 'form-status';
    navigator.geolocation.getCurrentPosition(function (pos) {
      origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      searchEl.value = '';
      selected = null;
      statusEl.textContent = 'Sorted by distance from you. Your location is not stored.';
      statusEl.className = 'form-status ok';
      load();
    }, function () {
      statusEl.textContent = 'We could not get your location. Search by city or pincode instead.';
      statusEl.className = 'form-status err';
    }, { timeout: 10000 });
  });

  FX.ready.then(load);
})();
