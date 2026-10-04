(function () {
  'use strict';

  var room = '';
  var rooms = [];
  var colourEl = document.getElementById('pref-colour');
  var budgetEl = document.getElementById('pref-budget');
  var results = document.getElementById('room-results');
  var blurb = document.getElementById('room-blurb');
  var buttons = document.getElementById('room-buttons');
  var counter = 0;

  function drawButtons() {
    buttons.innerHTML = rooms.map(function (r) {
      return '<button type="button" class="room-btn' + (r.id === room ? ' on' : '') + '" data-room="' + FX.esc(r.id) + '" aria-pressed="' + (r.id === room) + '">' + FX.esc(r.label) + '</button>';
    }).join('');
  }

  function load() {
    var mine = ++counter;
    var params = new URLSearchParams({ room: room });
    if (colourEl.value) params.set('colour', colourEl.value);
    if (budgetEl.value) params.set('maxPrice', budgetEl.value);

    var qs = new URLSearchParams(location.search);
    qs.set('room', room);
    history.replaceState(null, '', location.pathname + '?' + qs.toString());

    results.innerHTML = '<div class="skeleton" style="margin-top:30px"></div>';
    FX.api('/api/recommend?' + params.toString()).then(function (data) {
      if (mine !== counter) return;
      blurb.textContent = data.blurb;
      results.innerHTML = data.surfaces.map(function (s) {
        var body = s.picks.length
          ? '<div class="grid grid-4">' + s.picks.map(function (x) { return FX.card(x.product, { reasons: x.reasons }); }).join('') + '</div>'
          : '<div class="empty"><p>Nothing matches that colour and budget for this surface. Try loosening one of them.</p></div>';
        return '<section class="surface"><h3>' + FX.esc(s.label) + '</h3><p>' + FX.esc(s.why) + '</p>' + body + '</section>';
      }).join('');
      FX.compare.sync();
    }).catch(function (err) {
      if (mine !== counter) return;
      results.innerHTML = '<div class="notice" style="margin-top:30px">' + FX.esc(err.message) + '</div>';
    });
  }

  FX.ready.then(function () {
    return Promise.all([FX.api('/api/rooms'), FX.api('/api/products?limit=1')]);
  }).then(function (res) {
    rooms = res[0];
    var colours = res[1].facets.colours;
    colourEl.innerHTML = '<option value="">Any colour</option>' + colours.map(function (c) { return '<option>' + FX.esc(c) + '</option>'; }).join('');
    budgetEl.innerHTML = '<option value="">Any budget</option>' +
      [1000, 1500, 2500].map(function (n) { return '<option value="' + n + '">Up to ' + FX.money(n) + '</option>'; }).join('');

    var wanted = new URLSearchParams(location.search).get('room');
    room = rooms.some(function (r) { return r.id === wanted; }) ? wanted : rooms[0].id;
    drawButtons();
    load();

    buttons.addEventListener('click', function (e) {
      var b = e.target.closest('[data-room]');
      if (!b) return;
      room = b.dataset.room;
      drawButtons();
      load();
    });
    colourEl.addEventListener('change', load);
    budgetEl.addEventListener('change', load);
  }).catch(function (err) {
    results.innerHTML = '<div class="notice">' + FX.esc(err.message) + '</div>';
  });
})();
