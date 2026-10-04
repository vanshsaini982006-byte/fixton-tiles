/*
  tile-art.js
  Draws tile swatches as SVG, so the catalogue has something to show
  without needing a folder of photos.

  Usage:  TileArt.svg(product, 'card')
  Views:  card | face | close | layout | wide

  Each product has a "pattern" plus two colours (hex, hex2) in products.json.
  The random numbers are seeded from the product id, so a tile always
  looks the same every time the page loads.
*/
(function (root) {
  'use strict';

  var counter = 0;

  /* ---------- small helpers ---------- */

  // seeded random number generator (mulberry32)
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    }).join('');
  }

  // amt from -1 (black) to 1 (white)
  function shade(hex, amt) {
    var c = hexToRgb(hex);
    if (amt >= 0) return rgbToHex(c[0] + (255 - c[0]) * amt, c[1] + (255 - c[1]) * amt, c[2] + (255 - c[2]) * amt);
    return rgbToHex(c[0] * (1 + amt), c[1] * (1 + amt), c[2] * (1 + amt));
  }

  function luminance(hex) {
    var c = hexToRgb(hex);
    return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  }

  // "600 x 1200 mm" -> [1200, 600]  (always drawn landscape: long side across)
  function dims(size) {
    var m = /(\d+)\s*x\s*(\d+)/i.exec(size || '');
    var a = m ? +m[1] : 600;
    var b = m ? +m[2] : 600;
    return [Math.max(a, b), Math.min(a, b)];
  }

  function f(n) { return Math.round(n * 10) / 10; }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // smooth line through a list of points
  function smooth(pts) {
    var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2;
      var my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ' Q' + f(pts[i][0]) + ' ' + f(pts[i][1]) + ' ' + f(mx) + ' ' + f(my);
    }
    var last = pts[pts.length - 1];
    return d + ' L' + f(last[0]) + ' ' + f(last[1]);
  }

  function base(hex, w, h) {
    return '<rect width="' + w + '" height="' + h + '" fill="' + hex + '"/>';
  }

  /* ---------- drawing context (collects filter definitions) ---------- */

  function Ctx(uid) {
    this.uid = uid;
    this.defs = [];
    this.n = 0;
  }

  Ctx.prototype.id = function (tag) {
    this.n += 1;
    return 'ta' + this.uid + tag + this.n;
  };

  // Cloudy texture: an SVG noise filter turned into a see-through colour layer.
  // cycles = roughly how many blotches fit across the tile.
  Ctx.prototype.noise = function (w, h, cycles, octaves, seed, gain, bias, hex) {
    var id = this.id('f');
    var c = hexToRgb(hex).map(function (v) { return (v / 255).toFixed(3); });
    var freq = (cycles / Math.max(w, h)).toFixed(5);
    this.defs.push(
      '<filter id="' + id + '" x="0" y="0" width="' + w + '" height="' + h + '" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + freq + '" numOctaves="' + octaves + '" seed="' + seed + '"/>' +
      '<feColorMatrix type="matrix" values="0 0 0 0 ' + c[0] + ' 0 0 0 0 ' + c[1] + ' 0 0 0 0 ' + c[2] + ' 0 0 0 ' + gain + ' ' + bias + '"/>' +
      '</filter>'
    );
    return '<rect width="' + w + '" height="' + h + '" filter="url(#' + id + ')"/>';
  };

  /* ---------- patterns ---------- */
  // Each one draws a single tile of size w x h and returns SVG markup.
  // (p = product, r = random function, c = context)

  var P = {};

  P.plain = function (p, w, h, r, c) {
    return base(p.hex, w, h) +
      c.noise(w, h, 2, 2, (r() * 99) | 0, 0.55, -0.18, shade(p.hex, -0.4)) +
      c.noise(w, h, 6, 2, (r() * 99) | 0, 0.4, -0.14, shade(p.hex, 0.45));
  };

  // plain colour with a bevelled edge, the way a subway tile looks
  P.bevel = function (p, w, h, r, c) {
    var b = Math.max(4, Math.min(w, h) * 0.035);
    return P.plain(p, w, h, r, c) +
      '<polygon points="0,0 ' + w + ',0 ' + (w - b) + ',' + b + ' ' + b + ',' + b + '" fill="#fff" opacity=".28"/>' +
      '<polygon points="0,0 ' + b + ',' + b + ' ' + b + ',' + (h - b) + ' 0,' + h + '" fill="#fff" opacity=".16"/>' +
      '<polygon points="0,' + h + ' ' + b + ',' + (h - b) + ' ' + (w - b) + ',' + (h - b) + ' ' + w + ',' + h + '" fill="#000" opacity=".22"/>' +
      '<polygon points="' + w + ',0 ' + w + ',' + h + ' ' + (w - b) + ',' + (h - b) + ' ' + (w - b) + ',' + b + '" fill="#000" opacity=".14"/>';
  };

  P.marble = function (p, w, h, r, c) {
    var sc = Math.max(w, h) / 600;
    var s = base(p.hex, w, h);
    s += c.noise(w, h, 2.2, 3, (r() * 99) | 0, 1.0, -0.28, shade(p.hex, -0.16));
    s += c.noise(w, h, 5, 2, (r() * 99) | 0, 0.5, -0.2, shade(p.hex, 0.5));
    var veins = 3 + Math.floor(r() * 3);
    for (var i = 0; i < veins; i++) {
      var pts = [];
      var x = r() * w * 0.3;
      var y = r() * h;
      for (var k = 0; k <= 6; k++) {
        pts.push([x, y]);
        x += (w / 6) * (0.8 + r() * 0.5);
        y += (r() - 0.5) * h * 0.55 + (i % 2 ? 1 : -1) * h * 0.05;
      }
      var d = smooth(pts);
      var wd = (0.6 + r() * 2.6) * sc;
      s += '<path d="' + d + '" fill="none" stroke="' + p.hex2 + '" stroke-width="' + f(wd * 3) + '" stroke-opacity="' + f(0.06 + r() * 0.08) + '" stroke-linecap="round"/>';
      s += '<path d="' + d + '" fill="none" stroke="' + p.hex2 + '" stroke-width="' + f(wd) + '" stroke-opacity="' + (0.45 + r() * 0.4).toFixed(2) + '" stroke-linecap="round"/>';
      var branch = pts.slice(2, 5).map(function (q) {
        return [q[0] + (r() - 0.5) * 30 * sc, q[1] + (r() - 0.2) * 50 * sc];
      });
      s += '<path d="' + smooth(branch) + '" fill="none" stroke="' + p.hex2 + '" stroke-width="' + f(wd * 0.4) + '" stroke-opacity=".5" stroke-linecap="round"/>';
    }
    return s;
  };

  P.travertine = function (p, w, h, r, c) {
    var sc = Math.max(w, h) / 600;
    var s = base(p.hex, w, h);
    s += c.noise(w, h, 5, 3, (r() * 99) | 0, 0.9, -0.3, shade(p.hex, -0.2));
    for (var b = 0; b < 4; b++) {
      s += '<rect x="0" y="' + f(r() * h) + '" width="' + w + '" height="' + f(1.5 * sc + r() * 3 * sc) + '" fill="' + shade(p.hex, -0.3) + '" opacity=".1"/>';
    }
    for (var i = 0; i < 30; i++) {
      var len = (14 + r() * 50) * sc;
      s += '<ellipse cx="' + f(r() * w) + '" cy="' + f(r() * h) + '" rx="' + f(len / 2) + '" ry="' + f((1 + r() * 1.8) * sc) + '" fill="' + p.hex2 + '" opacity="' + (0.15 + r() * 0.3).toFixed(2) + '"/>';
    }
    return s;
  };

  P.concrete = function (p, w, h, r, c) {
    var sc = Math.max(w, h) / 600;
    var s = base(p.hex, w, h);
    s += c.noise(w, h, 2, 4, (r() * 99) | 0, 1.1, -0.45, shade(p.hex, -0.4));
    s += c.noise(w, h, 9, 2, (r() * 99) | 0, 0.5, -0.2, shade(p.hex, 0.4));
    for (var i = 0; i < 45; i++) {
      s += '<circle cx="' + f(r() * w) + '" cy="' + f(r() * h) + '" r="' + f((0.7 + r() * 1.6) * sc) + '" fill="' + (r() > 0.5 ? shade(p.hex, 0.4) : p.hex2) + '" opacity="' + (0.2 + r() * 0.3).toFixed(2) + '"/>';
    }
    return s;
  };

  // grain runs along the long side
  P.wood = function (p, w, h, r, c) {
    var s = base(p.hex, w, h);
    var lines = Math.round(h / 3.2);
    var d;
    for (var i = 0; i < lines; i++) {
      var y = ((i + 0.5) * h) / lines + (r() - 0.5) * 2;
      var amp = 1 + r() * 3;
      d = 'M0 ' + f(y);
      for (var k = 1; k <= 8; k++) {
        d += ' Q' + f((w / 8) * (k - 0.5)) + ' ' + f(y + (r() - 0.5) * amp * 2) + ' ' + f((w / 8) * k) + ' ' + f(y + (r() - 0.5) * amp);
      }
      s += '<path d="' + d + '" fill="none" stroke="' + shade(p.hex, (r() - 0.55) * 0.35) + '" stroke-width="' + f(0.7 + r() * 1.8) + '" stroke-opacity="' + (0.25 + r() * 0.4).toFixed(2) + '"/>';
    }
    if (r() > 0.4) {
      var kx = r() * w * 0.8 + w * 0.1;
      var ky = r() * h * 0.6 + h * 0.2;
      for (var j = 1; j <= 3; j++) {
        s += '<ellipse cx="' + f(kx) + '" cy="' + f(ky) + '" rx="' + f(j * 9) + '" ry="' + f(j * 2.2) + '" fill="none" stroke="' + p.hex2 + '" stroke-width="1.2" opacity="' + (0.5 - j * 0.1).toFixed(2) + '"/>';
      }
    }
    s += '<rect width="' + w + '" height="' + h + '" fill="' + shade(p.hex, (r() - 0.5) * 0.16) + '" opacity=".3"/>';
    s += c.noise(w, h, 40, 1, (r() * 99) | 0, 0.3, -0.1, shade(p.hex, -0.5));
    return s;
  };

  // stacked ledger stone: rows of different length pieces
  P.stack = function (p, w, h, r, c) {
    var s = base(shade(p.hex, -0.5), w, h);
    var y = 0;
    while (y < h) {
      var rowH = 14 + r() * 18;
      var x = 0;
      while (x < w) {
        var segW = 70 + r() * 140;
        s += '<rect x="' + f(x + 1) + '" y="' + f(y + 1) + '" width="' + f(Math.min(segW, w - x) - 2) + '" height="' + f(rowH - 2) + '" fill="' + shade(p.hex, (r() - 0.5) * 0.34) + '"/>';
        x += segW;
      }
      y += rowH;
    }
    s += c.noise(w, h, 14, 3, (r() * 99) | 0, 0.7, -0.2, shade(p.hex, -0.5));
    return s;
  };

  P.linen = function (p, w, h, r, c) {
    var id = c.id('p');
    c.defs.push(
      '<pattern id="' + id + '" patternUnits="userSpaceOnUse" width="5" height="5">' +
      '<path d="M0 .5H5" stroke="' + shade(p.hex, -0.3) + '" stroke-width="1" opacity=".18"/>' +
      '<path d="M.5 0V5" stroke="' + shade(p.hex, 0.4) + '" stroke-width="1" opacity=".25"/></pattern>'
    );
    return P.plain(p, w, h, r, c) + '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + ')"/>';
  };

  P.fluted = function (p, w, h, r, c) {
    var s = base(p.hex, w, h);
    var band = 14;
    for (var x = 0; x < w; x += band) {
      s += '<rect x="' + x + '" y="0" width="' + band * 0.38 + '" height="' + h + '" fill="#fff" opacity=".22"/>';
      s += '<rect x="' + f(x + band * 0.7) + '" y="0" width="' + band * 0.3 + '" height="' + h + '" fill="#000" opacity=".16"/>';
    }
    return s + c.noise(w, h, 4, 2, (r() * 99) | 0, 0.4, -0.15, shade(p.hex, -0.3));
  };

  P.hex = function (p, w, h, r) {
    var R = h / 6.5;
    var colW = Math.sqrt(3) * R;
    var palette = [p.hex, shade(p.hex, 0.12), p.hex2, shade(p.hex2, -0.18), p.hex];
    var s = base(shade(p.hex, -0.45), w, h);
    for (var row = -1; row * R * 1.5 < h + R; row++) {
      for (var col = -1; col * colW < w + colW; col++) {
        var cx = col * colW + (row % 2 ? colW / 2 : 0);
        var cy = row * R * 1.5;
        var pts = [];
        for (var a = 0; a < 6; a++) {
          var ang = (Math.PI / 180) * (60 * a - 30);
          pts.push(f(cx + R * 0.93 * Math.cos(ang)) + ',' + f(cy + R * 0.93 * Math.sin(ang)));
        }
        s += '<polygon points="' + pts.join(' ') + '" fill="' + palette[Math.floor(r() * palette.length)] + '"/>';
      }
    }
    return s;
  };

  P.sqmosaic = function (p, w, h, r, c) {
    var n = 8;
    var cell = w / n;
    var s = base(shade(p.hex, -0.55), w, h);
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < Math.round(h / cell); j++) {
        s += '<rect x="' + f(i * cell + 1.5) + '" y="' + f(j * cell + 1.5) + '" width="' + f(cell - 3) + '" height="' + f(cell - 3) + '" fill="' + shade(p.hex, (r() - 0.45) * 0.4) + '"/>';
      }
    }
    return s;
  };

  P.checker = function (p, w, h) {
    return base(p.hex, w, h) +
      '<rect x="' + w / 2 + '" y="0" width="' + w / 2 + '" height="' + h / 2 + '" fill="' + p.hex2 + '"/>' +
      '<rect x="0" y="' + h / 2 + '" width="' + w / 2 + '" height="' + h / 2 + '" fill="' + p.hex2 + '"/>';
  };

  // patterned cement tile: corner circles + centre diamond
  P.geo = function (p, w, h) {
    var s = base(p.hex2, w, h);
    [[0, 0], [w, 0], [0, h], [w, h]].forEach(function (pt) {
      s += '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="' + w * 0.5 + '" fill="' + p.hex + '"/>';
      s += '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="' + w * 0.36 + '" fill="' + p.hex2 + '"/>';
      s += '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="' + w * 0.24 + '" fill="' + p.hex + '"/>';
    });
    s += '<polygon points="' + w / 2 + ',' + h * 0.2 + ' ' + w * 0.8 + ',' + h / 2 + ' ' + w / 2 + ',' + h * 0.8 + ' ' + w * 0.2 + ',' + h / 2 + '" fill="' + p.hex + '"/>';
    s += '<polygon points="' + w / 2 + ',' + h * 0.32 + ' ' + w * 0.68 + ',' + h / 2 + ' ' + w / 2 + ',' + h * 0.68 + ' ' + w * 0.32 + ',' + h / 2 + '" fill="' + p.hex2 + '"/>';
    return s;
  };

  P.cobble = function (p, w, h, r, c) {
    var s = base(shade(p.hex, -0.6), w, h);
    var y = 0;
    while (y < h) {
      var rowH = 58 + r() * 34;
      var x = -r() * 50;
      while (x < w) {
        var bw = 66 + r() * 54;
        s += '<rect x="' + f(x + 3) + '" y="' + f(y + 3) + '" width="' + f(bw - 6) + '" height="' + f(rowH - 6) + '" rx="12" fill="' + shade(p.hex, (r() - 0.5) * 0.3) + '"/>';
        x += bw;
      }
      y += rowH;
    }
    return s + c.noise(w, h, 12, 3, (r() * 99) | 0, 0.6, -0.15, shade(p.hex, -0.5));
  };

  P.slate = function (p, w, h, r, c) {
    var sc = Math.max(w, h) / 600;
    var s = base(p.hex, w, h);
    s += c.noise(w, h, 3, 4, (r() * 99) | 0, 1.1, -0.4, shade(p.hex, -0.45));
    s += c.noise(w, h, 8, 3, (r() * 99) | 0, 0.6, -0.25, shade(p.hex, 0.35));
    for (var i = 0; i < 14; i++) {
      var y = r() * h;
      var d = 'M0 ' + f(y);
      for (var k = 1; k <= 5; k++) d += ' Q' + f((w / 5) * (k - 0.5)) + ' ' + f(y + (r() - 0.5) * 22 * sc) + ' ' + f((w / 5) * k) + ' ' + f(y + (r() - 0.5) * 14 * sc);
      s += '<path d="' + d + '" fill="none" stroke="' + (i % 2 ? shade(p.hex, 0.4) : shade(p.hex, -0.5)) + '" stroke-width="' + f((1 + r() * 2) * sc) + '" opacity=".25"/>';
    }
    for (var j = 0; j < 9; j++) {
      s += '<ellipse cx="' + f(r() * w) + '" cy="' + f(r() * h) + '" rx="' + f((6 + r() * 14) * sc) + '" ry="' + f((2 + r() * 4) * sc) + '" fill="' + p.hex2 + '" opacity=".28"/>';
    }
    return s;
  };

  // granite / terrazzo-like speckle
  P.speckle = function (p, w, h, r, c) {
    var sc = Math.max(w, h) / 600;
    var s = base(p.hex, w, h);
    s += c.noise(w, h, 7, 3, (r() * 99) | 0, 0.8, -0.25, shade(p.hex, -0.35));
    var colours = [shade(p.hex, -0.4), shade(p.hex, 0.38), p.hex2];
    for (var i = 0; i < 230; i++) {
      s += '<circle cx="' + f(r() * w) + '" cy="' + f(r() * h) + '" r="' + f((0.8 + r() * 2.2) * sc) + '" fill="' + colours[Math.floor(r() * 3)] + '" opacity="' + (0.45 + r() * 0.45).toFixed(2) + '"/>';
    }
    return s;
  };

  // hand-glazed look: uneven colour, soft edge
  P.handmade = function (p, w, h, r, c) {
    return base(p.hex, w, h) +
      c.noise(w, h, 3, 3, (r() * 99) | 0, 1.3, -0.5, shade(p.hex, -0.35)) +
      c.noise(w, h, 7, 2, (r() * 99) | 0, 0.8, -0.3, shade(p.hex, 0.35)) +
      '<rect x="3" y="3" width="' + (w - 6) + '" height="' + (h - 6) + '" rx="6" fill="none" stroke="' + shade(p.hex, -0.3) + '" stroke-width="3" opacity=".3"/>';
  };

  /* ---------- one tile ---------- */

  function drawTile(p, w, h, seed, variant, c) {
    var pattern = P[p.pattern] || P.plain;
    var r = rng(seed * 7919 + variant * 104729);
    var s = pattern(p, w, h, r, c);

    // each variant is nudged slightly lighter or darker, like tiles from a real batch
    var tone = (variant - 1) * 0.04;
    if (tone) s += '<rect width="' + w + '" height="' + h + '" fill="' + (tone > 0 ? '#fff' : '#000') + '" opacity="' + Math.abs(tone) + '"/>';

    // gloss: a flat diagonal reflection
    if (p.finish === 'Glossy' || p.finish === 'Polished') {
      var o = p.finish === 'Polished' ? 0.08 : 0.07;
      s += '<polygon points="0,0 ' + f(w * 0.5) + ',0 0,' + f(h * 1.0) + '" fill="#fff" opacity="' + o + '"/>';
      s += '<polygon points="' + f(w * 0.6) + ',0 ' + f(w * 0.68) + ',0 0,' + f(h * 1.0) + ' 0,' + f(h * 0.92) + '" fill="#fff" opacity=".04"/>';
    } else if (p.finish === 'Satin') {
      s += '<polygon points="0,0 ' + f(w * 0.45) + ',0 0,' + f(h * 0.9) + '" fill="#fff" opacity=".04"/>';
    }
    return s;
  }

  /* ---------- layouts ---------- */

  function layoutMode(p, w, h) {
    if (w / h >= 3) return 'stagger';
    if (p.pattern === 'bevel' || p.pattern === 'wood') return 'bond';
    return 'grid';
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  // positions for tiles covering an area of areaW x areaH
  function arrange(w, h, areaW, areaH, mode) {
    var cols = Math.ceil(areaW / w) + 2;
    var rows = Math.ceil(areaH / h) + 1;
    var x0 = (areaW - (cols - 2) * w) / 2 - w;
    var y0 = (areaH - (rows - 1) * h) / 2;
    var out = [];
    for (var j = 0; j < rows; j++) {
      var shift = mode === 'bond' ? (j % 2 ? w / 2 : 0) : mode === 'stagger' ? (j % 3) * (w / 3) : 0;
      for (var i = 0; i < cols; i++) {
        out.push({ x: x0 + i * w + shift, y: y0 + j * h, v: (i + j * 2) % 3 });
      }
    }
    return out;
  }

  /* ---------- public: build the whole svg ---------- */

  function svg(p, view) {
    view = view || 'card';
    counter += 1;
    var ctx = new Ctx(counter);
    var d = dims(p.size);
    var w = d[0];
    var h = d[1];
    var seed = p.id || 1;
    var label = esc(p.name + ' tile swatch');
    var head = '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + label + '" ';

    var variantCount = p.pattern === 'checker' || p.pattern === 'geo' ? 1 : 3;
    var defsTiles = [];
    for (var v = 0; v < variantCount; v++) {
      var cid = ctx.id('c');
      var body = drawTile(p, w, h, seed, v, ctx);
      defsTiles.push(
        '<clipPath id="' + cid + '"><rect width="' + w + '" height="' + h + '"/></clipPath>' +
        '<g id="ta' + ctx.uid + 't' + v + '" clip-path="url(#' + cid + ')">' + body + '</g>'
      );
    }

    function use(x, y, variant, sx, sy, gx, gy) {
      return '<use href="#ta' + ctx.uid + 't' + (variant % variantCount) + '" transform="translate(' + f(x + gx) + ' ' + f(y + gy) + ') scale(' + sx.toFixed(4) + ' ' + sy.toFixed(4) + ')"/>';
    }

    var grout = luminance(p.hex) > 0.5 ? '#a9a59b' : '#111111';

    // single tile, centred with a little space around it
    if (view === 'face') {
      var pad = Math.max(w, h) * 0.06;
      return head + 'viewBox="' + f(-pad) + ' ' + f(-pad) + ' ' + f(w + pad * 2) + ' ' + f(h + pad * 2) + '" preserveAspectRatio="xMidYMid meet">' +
        '<defs>' + ctx.defs.join('') + defsTiles.join('') + '</defs>' +
        '<use href="#ta' + ctx.uid + 't0"/>' +
        '<rect width="' + w + '" height="' + h + '" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="' + f(pad * 0.04) + '"/></svg>';
    }

    // zoomed in on the surface texture
    if (view === 'close') {
      var vh = Math.min(w, h) * 0.55;
      var vw = (vh * 4) / 3;
      return head + 'viewBox="' + f(w * 0.28) + ' ' + f((h - vh) / 2) + ' ' + f(vw) + ' ' + f(vh) + '" preserveAspectRatio="xMidYMid slice">' +
        '<defs>' + ctx.defs.join('') + defsTiles.join('') + '</defs>' +
        '<use href="#ta' + ctx.uid + 't0"/></svg>';
    }

    // laid out with grout lines - card, layout and wide only differ in how much is shown
    var spans = {
      card: clamp(w * 1.5, 600, 1400),
      layout: clamp(w * 2.2, 900, 2000),
      wide: clamp(w * 3.5, 1500, 3000)
    };
    var areaW = spans[view] || spans.card;
    var areaH = (areaW * 3) / 4;
    var gap = Math.max(3, areaW / 220);
    var mode = layoutMode(p, w, h);
    var tiles = arrange(w, h, areaW, areaH, mode);
    var sx = (w - gap) / w;
    var sy = (h - gap) / h;

    var out = head + 'viewBox="0 0 ' + f(areaW) + ' ' + f(areaH) + '" preserveAspectRatio="xMidYMid slice">' +
      '<defs>' + ctx.defs.join('') + defsTiles.join('') + '</defs>' +
      '<rect width="' + f(areaW) + '" height="' + f(areaH) + '" fill="' + grout + '"/>';
    tiles.forEach(function (t) {
      out += use(t.x, t.y, t.v, sx, sy, gap / 2, gap / 2);
    });
    return out + '</svg>';
  }

  var api = { svg: svg, shade: shade };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TileArt = api;
})(typeof window !== 'undefined' ? window : this);
