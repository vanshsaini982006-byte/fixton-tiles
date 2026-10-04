(function () {
  'use strict';

  var PAGE_SIZE = 12;

  var FILTERS = [
    { key: 'size', label: 'Size', facet: 'sizes' },
    { key: 'colour', label: 'Colour', facet: 'colours' },
    { key: 'finish', label: 'Finish', facet: 'finishes' },
    { key: 'material', label: 'Material', facet: 'materials' },
    { key: 'price', label: 'Price', facet: null },
    { key: 'application', label: 'Application', facet: 'applications' }
  ];

  var state = { category: '', q: '', size: '', colour: '', finish: '', material: '', application: '', price: '', sort: 'featured' };
  var priceRanges = [];
  var shown = 0;
  var total = 0;
  var requestId = 0;
  var filledFor = null;   // which category the dropdowns were last filled for
  var tabsBuilt = false;

  var grid = document.getElementById('grid');
  var emptyBox = document.getElementById('empty');
  var moreBtn = document.getElementById('more');
  var countEl = document.getElementById('count');
  var chipsEl = document.getElementById('chips');
  var searchEl = document.getElementById('search');
  var sortEl = document.getElementById('sort');

  /* ---------- url <-> state ---------- */

  function readUrl() {
    var params = new URLSearchParams(location.search);
    Object.keys(state).forEach(function (k) {
      if (params.get(k)) state[k] = params.get(k);
    });
    if (!FX.category[state.category]) state.category = '';
    searchEl.value = state.q;
    sortEl.value = state.sort;
  }

  function writeUrl() {
    var params = new URLSearchParams();
    Object.keys(state).forEach(function (k) {
      if (state[k] && !(k === 'sort' && state[k] === 'featured')) params.set(k, state[k]);
    });
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  /* ---------- building the request ---------- */

  function priceRange(id) {
    return priceRanges.find(function (r) { return r.id === id; }) || null;
  }

  function buildQuery(offset) {
    var params = new URLSearchParams();
    ['category', 'q', 'size', 'colour', 'finish', 'material', 'application', 'sort'].forEach(function (k) {
      if (state[k]) params.set(k, state[k]);
    });
    var range = priceRange(state.price);
    if (range) {
      if (range.min) params.set('minPrice', range.min);
      if (range.max) params.set('maxPrice', range.max);
    }
    params.set('limit', PAGE_SIZE);
    params.set('offset', offset);
    return params.toString();
  }

  /* ---------- drawing the controls ---------- */

  function buildTabs(counts) {
    var all = Object.keys(counts).reduce(function (t, k) { return t + counts[k]; }, 0);
    var html = '<button type="button" class="tab" data-cat="">All<small>' + all + '</small></button>';
    Object.keys(FX.category).forEach(function (k) {
      html += '<button type="button" class="tab" data-cat="' + k + '">' + FX.esc(FX.category[k]) + '<small>' + (counts[k] || 0) + '</small></button>';
    });
    document.getElementById('tabs').innerHTML = html;
    tabsBuilt = true;
  }

  function markTabs() {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('on', t.dataset.cat === state.category);
      t.setAttribute('aria-pressed', t.dataset.cat === state.category ? 'true' : 'false');
    });
  }

  function fillSelect(select, label, options, current) {
    var html = '<option value="">Any ' + FX.esc(label.toLowerCase()) + '</option>';
    options.forEach(function (o) {
      html += '<option value="' + FX.esc(o.value) + '"' + (o.value === current ? ' selected' : '') + '>' + FX.esc(o.text) + '</option>';
    });
    select.innerHTML = html;
  }

  function fillFilters(facets) {
    FILTERS.forEach(function (f) {
      var select = document.getElementById('f-' + f.key);
      var options;
      if (f.key === 'price') {
        options = priceRanges.map(function (r) { return { value: r.id, text: r.label }; });
      } else {
        options = facets[f.facet].map(function (v) { return { value: v, text: v }; });
        // a filter chosen under another tab may not exist here
        if (state[f.key] && facets[f.facet].indexOf(state[f.key]) === -1) state[f.key] = '';
      }
      fillSelect(select, f.label, options, state[f.key]);
    });
    filledFor = state.category;
  }

  function drawChips() {
    var html = '';
    FILTERS.forEach(function (f) {
      if (!state[f.key]) return;
      var text = f.key === 'price' ? (priceRange(state.price) || {}).label : state[f.key];
      html += '<button type="button" class="chip" data-clear="' + f.key + '" aria-label="Remove filter ' + FX.esc(f.label) + '">' + FX.esc(f.label) + ': ' + FX.esc(text) + ' &times;</button>';
    });
    if (state.q) html += '<button type="button" class="chip" data-clear="q" aria-label="Clear search">Search: ' + FX.esc(state.q) + ' &times;</button>';
    if (html) html += '<button type="button" class="link-btn" id="chips-clear">Clear all</button>';
    chipsEl.innerHTML = html;
  }

  /* ---------- loading ---------- */

  function load(reset) {
    var mine = ++requestId;
    var offset = reset ? 0 : shown;
    if (reset) {
      writeUrl();
      drawChips();
      markTabs();
      moreBtn.hidden = true;
      emptyBox.hidden = true;
    }
    moreBtn.disabled = true;

    FX.api('/api/products?' + buildQuery(offset)).then(function (data) {
      if (mine !== requestId) return; // an older request finished late, ignore it

      if (!tabsBuilt) { buildTabs(data.facets.categories); markTabs(); }
      if (filledFor !== state.category) {
        var before = JSON.stringify(state);
        fillFilters(data.facets);
        // a filter that does not exist in this collection was dropped, so the
        // results we just got are wrong - search again without it
        if (JSON.stringify(state) !== before) return load(true);
      }

      if (reset) { grid.innerHTML = ''; shown = 0; }
      grid.insertAdjacentHTML('beforeend', data.items.map(function (p) { return FX.card(p); }).join(''));
      shown += data.items.length;
      total = data.total;

      var where = state.category ? FX.category[state.category].toLowerCase() : 'tiles';
      countEl.textContent = total === 0 ? '' : 'Showing ' + shown + ' of ' + total + ' ' + where;
      emptyBox.hidden = total !== 0;
      moreBtn.hidden = shown >= total;
      moreBtn.disabled = false;
      FX.compare.sync();
    }).catch(function (err) {
      if (mine !== requestId) return;
      grid.innerHTML = '<div class="notice" style="grid-column:1/-1">Could not load the tiles. ' + FX.esc(err.message) + '</div>';
      moreBtn.disabled = false;
    });
  }

  function clearAll() {
    ['q', 'size', 'colour', 'finish', 'material', 'application', 'price'].forEach(function (k) { state[k] = ''; });
    searchEl.value = '';
    FILTERS.forEach(function (f) { document.getElementById('f-' + f.key).value = ''; });
    load(true);
  }

  /* ---------- events ---------- */

  document.getElementById('tabs').addEventListener('click', function (e) {
    var tab = e.target.closest('.tab');
    if (!tab) return;
    state.category = tab.dataset.cat;
    load(true);
  });

  document.getElementById('filters').addEventListener('change', function (e) {
    var key = e.target.dataset.key;
    if (!key) return;
    state[key] = e.target.value;
    load(true);
  });

  sortEl.addEventListener('change', function () {
    state.sort = sortEl.value;
    load(true);
  });

  searchEl.addEventListener('input', FX.debounce(function () {
    state.q = searchEl.value.trim();
    load(true);
  }, 250));

  chipsEl.addEventListener('click', function (e) {
    if (e.target.id === 'chips-clear') return clearAll();
    var chip = e.target.closest('[data-clear]');
    if (!chip) return;
    var key = chip.dataset.clear;
    state[key] = '';
    if (key === 'q') searchEl.value = '';
    else document.getElementById('f-' + key).value = '';
    load(true);
  });

  document.getElementById('empty-clear').addEventListener('click', clearAll);
  moreBtn.addEventListener('click', function () { load(false); });

  /* ---------- start ---------- */

  FX.ready.then(function () {
    var m = FX.money;
    priceRanges = [
      { id: '0-800', label: 'Under ' + m(800), min: 0, max: 800 },
      { id: '800-1500', label: m(800) + ' to ' + m(1500), min: 800, max: 1500 },
      { id: '1500-2500', label: m(1500) + ' to ' + m(2500), min: 1500, max: 2500 },
      { id: '2500-', label: m(2500) + ' and above', min: 2500, max: 0 }
    ];
    readUrl();
    load(true);
  });
})();
