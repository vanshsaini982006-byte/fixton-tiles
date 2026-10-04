(function () {
  'use strict';

  FX.ready.then(function () {
    return FX.api('/api/products?offer=1&limit=60&sort=price-asc');
  }).then(function (data) {
    var grid = document.getElementById('offers');
    if (!data.items.length) {
      document.getElementById('no-offers').hidden = false;
      return;
    }
    // soonest ending first
    data.items.sort(function (a, b) { return a.offerEnds < b.offerEnds ? -1 : 1; });
    grid.innerHTML = data.items.map(function (p) {
      var card = FX.card(p);
      var note = '<p class="muted" style="font-size:.8rem;margin:10px 0 0">Ends ' + FX.esc(FX.date(p.offerEnds)) + '</p>';
      // slip the end date in just before the card closes
      return card.replace(/<\/div>\s*<\/article>$/, note + '</div></article>');
    }).join('');
    FX.compare.sync();
  }).catch(function (err) {
    document.getElementById('offers').innerHTML = '<div class="notice" style="grid-column:1/-1">' + FX.esc(err.message) + '</div>';
  });
})();
