(function () {
  'use strict';

  var KEY = 'fx_admin_key';
  var key = '';
  var loginForm = document.getElementById('login');
  var loginStatus = document.getElementById('login-status');
  var panel = document.getElementById('panel');

  var TYPES = { quote: 'Quote', help: 'Help', bulk: 'Bulk / dealer', other: 'Other' };

  function call(path, options) {
    options = options || {};
    options.headers = Object.assign({ 'x-admin-key': key, 'Content-Type': 'application/json' }, options.headers || {});
    return FX.api(path, options);
  }

  function remember(value) {
    try { sessionStorage.setItem(KEY, value); } catch (e) { /* ignore */ }
  }

  function forget() {
    try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  function drawEnquiries(list) {
    document.getElementById('n-enq').textContent = list.length;
    var el = document.getElementById('enquiries');
    if (!list.length) {
      el.innerHTML = '<p class="muted" style="padding:24px">No enquiries yet.</p>';
      return;
    }
    el.innerHTML = '<table class="table"><thead><tr><th>Ref</th><th>Received</th><th>Customer</th><th>Contact</th><th>Request</th><th>Status</th></tr></thead><tbody>' +
      list.map(function (e) {
        var meta = [TYPES[e.type] || e.type];
        if (e.customerType) meta.push(e.customerType);
        if (e.city) meta.push(e.city);
        var tile = e.productName ? '<br><a href="/product/' + FX.esc(e.productSlug) + '" style="color:var(--gold)">' + FX.esc(e.productName) + '</a>' : '';
        var area = e.areaSqm ? '<br>Area: ' + FX.esc(e.areaSqm) + ' sqm' : '';
        return '<tr>' +
          '<td>' + FX.esc(e.reference) + '</td>' +
          '<td>' + FX.esc(new Date(e.createdAt).toLocaleString('en-IN')) + '</td>' +
          '<td>' + FX.esc(e.name) + '<br><span class="muted">' + FX.esc(meta.join(' / ')) + '</span></td>' +
          '<td><a href="tel:' + FX.esc(e.phone.replace(/[^\d+]/g, '')) + '" style="color:var(--gold)">' + FX.esc(e.phone) + '</a>' + (e.email ? '<br>' + FX.esc(e.email) : '') + '</td>' +
          '<td class="msg">' + FX.esc(e.message) + tile + area + '</td>' +
          '<td><select data-id="' + e.id + '" aria-label="Status for ' + FX.esc(e.reference) + '">' +
            ['new', 'contacted', 'closed'].map(function (s) { return '<option value="' + s + '"' + (e.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
          '</select></td></tr>';
      }).join('') + '</tbody></table>';
  }

  function drawReviews(list) {
    document.getElementById('n-rev').textContent = list.length;
    var el = document.getElementById('reviews');
    if (!list.length) {
      el.innerHTML = '<p class="muted" style="padding:24px">No reviews yet.</p>';
      return;
    }
    el.innerHTML = '<table class="table"><thead><tr><th>Date</th><th>Tile</th><th>Rating</th><th>Review</th><th></th></tr></thead><tbody>' +
      list.map(function (r) {
        return '<tr>' +
          '<td>' + FX.esc(FX.date(r.createdAt)) + '</td>' +
          '<td>' + FX.esc(r.productSlug) + '</td>' +
          '<td>' + r.rating + ' / 5</td>' +
          '<td class="msg"><strong>' + FX.esc(r.title) + '</strong>\n' + FX.esc(r.comment) + '\n<span class="muted">' + FX.esc(r.name) + '</span></td>' +
          '<td><button type="button" class="link-btn" data-del="' + r.id + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table>';
  }

  function loadAll() {
    return Promise.all([call('/api/admin/enquiries'), call('/api/admin/reviews')]).then(function (res) {
      drawEnquiries(res[0]);
      drawReviews(res[1]);
      loginForm.hidden = true;
      panel.hidden = false;
    });
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    key = document.getElementById('key').value;
    loginStatus.textContent = '';
    loadAll().then(function () {
      remember(key);
    }).catch(function (err) {
      loginStatus.textContent = err.message;
      loginStatus.className = 'form-status err';
    });
  });

  document.getElementById('logout').addEventListener('click', function () {
    forget();
    key = '';
    panel.hidden = true;
    loginForm.hidden = false;
    document.getElementById('key').value = '';
  });

  panel.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-tab]');
    if (tab) {
      document.querySelectorAll('[data-tab]').forEach(function (t) { t.classList.toggle('on', t === tab); });
      document.getElementById('enquiries').hidden = tab.dataset.tab !== 'enquiries';
      document.getElementById('reviews').hidden = tab.dataset.tab !== 'reviews';
      return;
    }
    var del = e.target.closest('[data-del]');
    if (del && confirm('Delete this review for good?')) {
      call('/api/admin/reviews/' + del.dataset.del, { method: 'DELETE' }).then(loadAll).catch(function (err) { alert(err.message); });
    }
  });

  panel.addEventListener('change', function (e) {
    var select = e.target.closest('select[data-id]');
    if (!select) return;
    call('/api/admin/enquiries/' + select.dataset.id, { method: 'PATCH', body: JSON.stringify({ status: select.value }) })
      .catch(function (err) { alert(err.message); loadAll(); });
  });

  // stay signed in for this browser tab
  try {
    var saved = sessionStorage.getItem(KEY);
    if (saved) {
      key = saved;
      loadAll().catch(function () { forget(); });
    }
  } catch (e) { /* ignore */ }
})();
