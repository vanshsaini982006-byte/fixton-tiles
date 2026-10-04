// Room-wise recommendations.
// This is a plain rule-based scorer: each room has one or more surfaces
// (floor, walls, splashback...) and each surface lists what suits it.
// A tile must be rated for one of the surface's applications to show up at all.

const catalogue = require('./catalogue');

const ROOMS = [
  {
    id: 'living',
    label: 'Living room',
    blurb: 'Big, calm floors that take foot traffic, plus one wall with some character.',
    surfaces: [
      {
        key: 'floor',
        label: 'Floor',
        why: 'Large formats mean fewer grout lines, and polished or matt finishes are easy to keep clean.',
        applications: ['Floor'],
        categories: ['floor'],
        finishes: ['Polished', 'Matt'],
        avoid: ['Anti-skid'],
        materials: ['Porcelain', 'Vitrified'],
        minSideMm: 600
      },
      {
        key: 'feature',
        label: 'Feature wall',
        why: 'Textured or stone-look walls add depth behind a sofa or TV unit.',
        applications: ['Wall'],
        categories: ['wall'],
        finishes: ['Textured', 'Matt', 'Polished'],
        avoid: [],
        materials: ['Natural Stone', 'Porcelain']
      }
    ]
  },
  {
    id: 'bedroom',
    label: 'Bedroom',
    blurb: 'Warm underfoot colours and a quiet accent wall behind the bed.',
    surfaces: [
      {
        key: 'floor',
        label: 'Floor',
        why: 'Wood-look and soft matt tiles feel warmer than glossy ones.',
        applications: ['Floor'],
        categories: ['floor'],
        finishes: ['Matt', 'Textured'],
        avoid: ['Anti-skid', 'Glossy'],
        materials: ['Porcelain', 'Vitrified'],
        colours: ['Brown', 'Beige']
      },
      {
        key: 'accent',
        label: 'Accent wall',
        why: 'Soft matt and fluted surfaces keep the room restful.',
        applications: ['Wall'],
        categories: ['wall'],
        finishes: ['Matt', 'Textured', 'Satin'],
        avoid: ['Glossy'],
        materials: []
      }
    ]
  },
  {
    id: 'bathroom',
    label: 'Bathroom',
    blurb: 'Grip underfoot and walls that shrug off water and steam.',
    surfaces: [
      {
        key: 'floor',
        label: 'Floor',
        why: 'Wet floors need an anti-skid or matt finish. Polished tiles get slippery fast.',
        applications: ['Wet Area'],
        categories: ['bathroom', 'outdoor'],
        finishes: ['Anti-skid', 'Matt'],
        avoid: ['Polished', 'Glossy'],
        materials: ['Ceramic', 'Porcelain']
      },
      {
        key: 'walls',
        label: 'Walls',
        why: 'Glossy and satin walls reflect light in small rooms and wipe clean in seconds.',
        applications: ['Wall'],
        categories: ['bathroom', 'wall'],
        finishes: ['Glossy', 'Satin', 'Matt', 'Polished'],
        avoid: [],
        materials: ['Ceramic', 'Glass', 'Porcelain']
      }
    ]
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    blurb: 'A floor that survives spills and dropped pans, and a splashback you can wipe down.',
    surfaces: [
      {
        key: 'floor',
        label: 'Floor',
        why: 'Hard-wearing porcelain or vitrified in a matt finish hides marks and stays safe when wet.',
        applications: ['Floor'],
        categories: ['kitchen', 'floor'],
        finishes: ['Matt', 'Anti-skid'],
        avoid: ['Polished'],
        materials: ['Porcelain', 'Vitrified']
      },
      {
        key: 'splashback',
        label: 'Splashback',
        why: 'Glossy glazed tiles take grease and sauce splashes with a quick wipe.',
        applications: ['Splashback'],
        categories: ['kitchen'],
        finishes: ['Glossy', 'Satin'],
        avoid: ['Textured'],
        materials: ['Ceramic']
      }
    ]
  },
  {
    id: 'balcony',
    label: 'Balcony or terrace',
    blurb: 'Tiles that cope with sun, rain and bare feet.',
    surfaces: [
      {
        key: 'floor',
        label: 'Floor',
        why: 'Anti-skid or textured surfaces and extra thickness stand up to weather.',
        applications: ['Wet Area'],
        categories: ['outdoor'],
        finishes: ['Anti-skid', 'Textured'],
        avoid: ['Polished', 'Glossy'],
        materials: ['Natural Stone', 'Porcelain'],
        minThickness: 12
      }
    ]
  },
  {
    id: 'staircase',
    label: 'Staircase',
    blurb: 'Treads need grip first, looks second.',
    surfaces: [
      {
        key: 'steps',
        label: 'Steps',
        why: 'Tiles rated for staircases with a textured or anti-skid surface are the safe choice.',
        applications: ['Staircase'],
        categories: ['outdoor', 'floor'],
        finishes: ['Anti-skid', 'Textured', 'Matt'],
        avoid: ['Polished', 'Glossy'],
        materials: ['Natural Stone', 'Porcelain']
      }
    ]
  }
];

function listRooms() {
  return ROOMS.map((r) => ({
    id: r.id,
    label: r.label,
    blurb: r.blurb,
    surfaces: r.surfaces.map((s) => s.label)
  }));
}

function scoreProduct(p, s, prefs) {
  const matchedApps = p.application.filter((a) => s.applications.includes(a));
  if (!matchedApps.length) return null;
  if (prefs.maxPrice && p.effectivePrice > prefs.maxPrice) return null;

  let score = 4;
  const reasons = [];
  reasons.push('Rated for ' + matchedApps[0].toLowerCase() + ' use');

  if (s.categories && s.categories.includes(p.category)) score += 2;

  if (s.finishes && s.finishes.includes(p.finish)) {
    score += 3;
    reasons.push(p.finish + ' finish suits this surface');
  }
  if (s.avoid && s.avoid.includes(p.finish)) score -= 6;

  if (s.materials && s.materials.includes(p.material)) {
    score += 1;
    reasons.push(p.material + ' body');
  }

  if (s.minSideMm) {
    const longSide = Math.max.apply(null, catalogue.dims(p.size));
    if (longSide >= s.minSideMm) {
      score += 1;
      reasons.push('Large format, fewer grout lines');
    }
  }

  if (s.minThickness && p.thickness >= s.minThickness) {
    score += 1;
    reasons.push(p.thickness + ' mm thick for outdoor wear');
  }

  if (s.colours && s.colours.includes(p.colour)) score += 1;

  if (prefs.colour) {
    if (p.colour === prefs.colour) {
      score += 3;
      reasons.push('Matches your ' + p.colour.toLowerCase() + ' preference');
    } else {
      score -= 1;
    }
  }

  if (p.offerActive) score += 0.5;
  score += p.avgRating * 0.2;

  return { score, reasons: reasons.slice(0, 3) };
}

function recommend(roomId, prefs, perSurface) {
  const room = ROOMS.find((r) => r.id === roomId);
  if (!room) return null;
  const products = catalogue.all();
  const limit = perSurface || 4;

  const surfaces = room.surfaces.map((s) => {
    const picks = [];
    for (const p of products) {
      const result = scoreProduct(p, s, prefs || {});
      if (result && result.score > 0) {
        picks.push({ product: p, score: result.score, reasons: result.reasons });
      }
    }
    picks.sort((a, b) => b.score - a.score || a.product.effectivePrice - b.product.effectivePrice);
    return {
      key: s.key,
      label: s.label,
      why: s.why,
      picks: picks.slice(0, limit).map((x) => ({ product: x.product, reasons: x.reasons }))
    };
  });

  return { id: room.id, label: room.label, blurb: room.blurb, surfaces };
}

module.exports = { listRooms, recommend };
