// Builds data/products.json from the compact table below.
// Run it with:  npm run seed
// (products.json is already generated, so you only need this if you edit the table.)
//
// Each row: name, category, size, colour, finish, material, applications,
//           thickness (mm), price per sqm, pattern, main hex, second hex, description
//
// "pattern", "hex" and "hex2" tell the front end how to draw the tile
// (there are no photos in this project - the swatches are drawn in SVG).
// To use real photos later, add an "image" field to a product and show it in the cards.

const fs = require('fs');
const path = require('path');

const ROWS = [
  // ---- FLOOR ----
  ['Carrara White', 'floor', '600 x 600 mm', 'White', 'Polished', 'Porcelain', ['Floor', 'Wall'], 9, 1450, 'marble', '#e8e7e3', '#8f9194',
    'Soft grey veining on a clean white body. Works on living room floors and bathroom walls alike.'],
  ['Calacatta Gold', 'floor', '600 x 1200 mm', 'White', 'Polished', 'Porcelain', ['Floor', 'Wall'], 10, 2650, 'marble', '#ece7dc', '#b79a5c',
    'Bold gold veining across a warm white ground. Large format keeps grout lines to a minimum.'],
  ['Nero Marquina', 'floor', '600 x 1200 mm', 'Black', 'Polished', 'Porcelain', ['Floor', 'Wall'], 10, 2800, 'marble', '#161616', '#d9d9d6',
    'Deep black with sharp white veins. Best in rooms with plenty of natural light.'],
  ['Travertine Sand', 'floor', '600 x 600 mm', 'Beige', 'Matt', 'Vitrified', ['Floor'], 9, 1180, 'travertine', '#cdbb9c', '#a8926f',
    'Warm sandy tone with the small pits and bands you see in real travertine.'],
  ['Urban Concrete', 'floor', '600 x 600 mm', 'Grey', 'Matt', 'Porcelain', ['Floor', 'Wall'], 9, 1320, 'concrete', '#8b8d8e', '#5f6264',
    'Cast-concrete look without the cracking. A good fit for modern flats and offices.'],
  ['Slate Charcoal', 'floor', '600 x 600 mm', 'Grey', 'Textured', 'Natural Stone', ['Floor', 'Staircase'], 15, 1900, 'slate', '#4a4d50', '#7b6a58',
    'Real slate with a split-face surface. Every tile is a little different.'],
  ['Oak Plank Natural', 'floor', '200 x 1200 mm', 'Brown', 'Matt', 'Porcelain', ['Floor'], 9, 1560, 'wood', '#b58a5a', '#7a5636',
    'Light oak planks in porcelain, so you get the look of wood with none of the upkeep.'],
  ['Walnut Plank Dark', 'floor', '200 x 1200 mm', 'Brown', 'Textured', 'Porcelain', ['Floor'], 9, 1620, 'wood', '#5b3d2a', '#2f1d12',
    'Dark walnut grain with a brushed texture you can feel underfoot.'],
  ['Ivory Plain Gloss', 'floor', '600 x 600 mm', 'White', 'Glossy', 'Vitrified', ['Floor'], 8, 780, 'plain', '#efeadf', '#d8d1c0',
    'A simple ivory floor tile at an easy price. Good for rentals and shops.'],

  // ---- WALL ----
  ['Subway White Gloss', 'wall', '300 x 600 mm', 'White', 'Glossy', 'Ceramic', ['Wall', 'Splashback'], 8, 640, 'bevel', '#f3f3f0', '#d4d4cf',
    'Classic bevelled white. Lay it in a brick pattern for the traditional metro look.'],
  ['Sage Brick Gloss', 'wall', '300 x 600 mm', 'Green', 'Glossy', 'Ceramic', ['Wall', 'Splashback'], 8, 720, 'bevel', '#8fa08a', '#6f836b',
    'A muted sage green with a bevelled edge. Softer than white, still easy to clean.'],
  ['Stone Cladding Ash', 'wall', '300 x 600 mm', 'Grey', 'Textured', 'Natural Stone', ['Wall', 'Staircase'], 12, 2150, 'stack', '#7d7f7c', '#4d4f4c',
    'Stacked ledger stone for feature walls, fireplaces and entrances.'],
  ['Linen Weave Beige', 'wall', '300 x 600 mm', 'Beige', 'Matt', 'Ceramic', ['Wall'], 8, 690, 'linen', '#d6c9b2', '#b9a98c',
    'A fine woven texture in a soft beige. Quiet enough for bedrooms and hallways.'],
  ['Terracotta Zellige', 'wall', '300 x 300 mm', 'Terracotta', 'Glossy', 'Ceramic', ['Wall', 'Splashback'], 8, 980, 'handmade', '#b8613f', '#8e4528',
    'Uneven hand-glazed look with variation from tile to tile, on purpose.'],
  ['Navy Satin Wall', 'wall', '300 x 600 mm', 'Blue', 'Satin', 'Ceramic', ['Wall'], 8, 760, 'plain', '#1f3350', '#10203a',
    'Deep navy with a soft satin sheen. Pairs well with brass fittings and white grout.'],
  ['Fluted Cream', 'wall', '300 x 600 mm', 'Beige', 'Textured', 'Porcelain', ['Wall'], 9, 1380, 'fluted', '#e2d6c1', '#c4b69b',
    'Vertical ribs that catch the light differently through the day.'],
  ['Grey Marble Accent', 'wall', '600 x 1200 mm', 'Grey', 'Polished', 'Porcelain', ['Wall', 'Floor'], 10, 2350, 'marble', '#b9bbbd', '#5d5f63',
    'Cool grey marble effect with dark veins. Works for a wall behind a TV or a bed.'],

  // ---- BATHROOM ----
  ['Pebble Grip Grey', 'bathroom', '300 x 300 mm', 'Grey', 'Anti-skid', 'Ceramic', ['Floor', 'Wet Area'], 8, 890, 'speckle', '#9a9c9a', '#6d706f',
    'Fine grip surface for shower floors and wet rooms. Speckled grey hides water marks.'],
  ['Hex Mosaic Mono', 'bathroom', '300 x 300 mm', 'Black', 'Matt', 'Porcelain', ['Floor', 'Wall', 'Wet Area'], 8, 1980, 'hex', '#2b2b2b', '#d9d6cf',
    'Small hexagons in charcoal, black and stone. The many grout lines give extra grip.'],
  ['Glass Mosaic Aqua', 'bathroom', '300 x 300 mm', 'Blue', 'Glossy', 'Glass', ['Wall', 'Wet Area'], 6, 2450, 'sqmosaic', '#4f8c9a', '#2f6573',
    'Small glass squares in shades of aqua. Good for shower niches and feature strips.'],
  ['Calm White Matt', 'bathroom', '300 x 600 mm', 'White', 'Matt', 'Ceramic', ['Wall'], 8, 620, 'plain', '#f1f0ec', '#dcdad2',
    'Plain matt white. The easiest way to make a small bathroom feel bigger.'],
  ['Bianco Statuario', 'bathroom', '600 x 1200 mm', 'White', 'Polished', 'Porcelain', ['Wall', 'Floor'], 10, 2750, 'marble', '#f2f2f0', '#6f7378',
    'Bright white with clear grey veining. Use on walls in wet areas and keep the floor matt.'],
  ['Teak Look Bath', 'bathroom', '150 x 600 mm', 'Brown', 'Anti-skid', 'Porcelain', ['Floor', 'Wet Area'], 9, 1490, 'wood', '#a98a68', '#6f5337',
    'Teak-coloured planks with an anti-skid finish for bathroom floors and spa corners.'],
  ['Sea Green Gloss', 'bathroom', '300 x 600 mm', 'Green', 'Glossy', 'Ceramic', ['Wall'], 8, 740, 'plain', '#5f8a7e', '#3d6358',
    'A calm blue-green gloss that looks different at every time of day.'],

  // ---- KITCHEN ----
  ['Metro Cream', 'kitchen', '300 x 600 mm', 'Beige', 'Glossy', 'Ceramic', ['Splashback', 'Wall'], 8, 690, 'bevel', '#eadfc8', '#cfc2a5',
    'Cream bevelled tile for splashbacks. Warmer than white and forgiving with stains.'],
  ['Graphite Matt', 'kitchen', '600 x 600 mm', 'Grey', 'Matt', 'Porcelain', ['Floor'], 9, 1380, 'concrete', '#55585b', '#33363a',
    'Dark grey floor that hides crumbs, spills and shoe marks. Rated for heavy use.'],
  ['Checker Black White', 'kitchen', '300 x 300 mm', 'Black', 'Glossy', 'Ceramic', ['Floor', 'Splashback'], 8, 1150, 'checker', '#151515', '#f0efec',
    'Each tile is a 2 by 2 check, so a floor reads as a proper chessboard.'],
  ['Honey Oak Parquet', 'kitchen', '150 x 600 mm', 'Brown', 'Matt', 'Porcelain', ['Floor', 'Wall'], 9, 1720, 'wood', '#a67c52', '#6d4a2b',
    'Narrow oak-look planks in a honey tone. Stagger them or lay them straight.'],
  ['Cement Pattern Blue', 'kitchen', '300 x 300 mm', 'Blue', 'Matt', 'Ceramic', ['Floor', 'Splashback'], 8, 1240, 'geo', '#2f5d7c', '#e8e2d4',
    'Patterned cement-style tile. Laid in a grid the corner circles join up into flowers.'],
  ['Honey Stone Matt', 'kitchen', '600 x 600 mm', 'Beige', 'Matt', 'Vitrified', ['Floor'], 9, 1250, 'travertine', '#c8aa7e', '#a38559',
    'Warm stone look in a matt vitrified body. Hard to scratch, easy to mop.'],

  // ---- OUTDOOR ----
  ['Granite Grey Grip', 'outdoor', '600 x 600 mm', 'Grey', 'Anti-skid', 'Natural Stone', ['Floor', 'Wet Area', 'Staircase'], 20, 2300, 'speckle', '#8a8c8c', '#4f5252',
    'Flamed granite with a rough surface. Good for steps, pool surrounds and driveways.'],
  ['Terrace Wood Grip', 'outdoor', '200 x 1200 mm', 'Brown', 'Anti-skid', 'Porcelain', ['Floor', 'Wet Area'], 20, 2150, 'wood', '#8a6a4a', '#573c25',
    '20 mm outdoor porcelain planks. Looks like decking, never rots or needs oiling.'],
  ['Sandstone Rustic', 'outdoor', '600 x 600 mm', 'Beige', 'Textured', 'Natural Stone', ['Floor', 'Wall', 'Staircase'], 18, 1950, 'travertine', '#c4a77d', '#97794f',
    'Natural sandstone with a rough face. Colour varies from batch to batch.'],
  ['Cobble Dark', 'outdoor', '300 x 300 mm', 'Grey', 'Textured', 'Vitrified', ['Floor'], 15, 1050, 'cobble', '#5a5c5e', '#2d2f31',
    'Cobble-effect tile for driveways, porches and garden paths.'],
  ['Pool Edge Blue', 'outdoor', '300 x 300 mm', 'Blue', 'Anti-skid', 'Ceramic', ['Wet Area', 'Staircase'], 12, 1320, 'speckle', '#5c8fb0', '#2f5f80',
    'Anti-skid blue tile for pool decks and steps into the water.'],
  ['Moss Green Slate', 'outdoor', '600 x 600 mm', 'Green', 'Textured', 'Natural Stone', ['Floor', 'Wall'], 18, 2050, 'slate', '#4f5f4c', '#8a7a52',
    'Green-grey slate with rust-coloured flecks. Good for garden walls and patios.']
];

// How many tiles come in a box. Coverage per box is worked out from this.
const PIECES_PER_BOX = {
  '300 x 300 mm': 11,
  '300 x 600 mm': 6,
  '600 x 600 mm': 4,
  '600 x 1200 mm': 2,
  '200 x 1200 mm': 6,
  '150 x 600 mm': 12
};

const CATEGORY_CODE = { floor: 'FL', wall: 'WL', bathroom: 'BA', kitchen: 'KI', outdoor: 'OU' };

// ids that get a "featured" flag, and the ones that carry an offer
const FEATURED = [1, 2, 5, 7, 17, 19];
const OFFERS = {
  4: { offerPercent: 20, offerEnds: '2026-12-31' },
  5: { offerPercent: 15, offerEnds: '2026-12-31' },
  10: { offerPercent: 10, offerEnds: '2026-11-30' },
  26: { offerPercent: 12, offerEnds: '2026-12-15' },
  31: { offerPercent: 10, offerEnds: '2026-11-30' }
};

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const products = ROWS.map((row, i) => {
  const id = i + 1;
  const [name, category, size, colour, finish, material, application, thickness, price, pattern, hex, hex2, description] = row;
  const [a, b] = size.match(/\d+/g).map(Number);
  const pieces = PIECES_PER_BOX[size];
  const product = {
    id,
    slug: slugify(name),
    sku: 'FX-' + CATEGORY_CODE[category] + '-' + String(id).padStart(3, '0'),
    name,
    category,
    size,
    colour,
    finish,
    material,
    application,
    thickness,
    price,
    piecesPerBox: pieces,
    coveragePerBox: Math.round(pieces * (a * b) / 10000) / 100,
    pattern,
    hex,
    hex2,
    description,
    featured: FEATURED.includes(id),
    addedOn: addDays('2026-06-01', id * 2)
  };
  if (OFFERS[id]) Object.assign(product, OFFERS[id]);
  return product;
});

const slugs = new Set(products.map((p) => p.slug));
if (slugs.size !== products.length) throw new Error('Duplicate product slugs');

fs.writeFileSync(path.join(__dirname, '..', 'data', 'products.json'), JSON.stringify(products, null, 2) + '\n');
console.log('Wrote ' + products.length + ' products to data/products.json');
