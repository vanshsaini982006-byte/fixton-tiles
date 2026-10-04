# Fixton Tiles - Smart Digital Tiles Platform

A website for a tiles company, built from the "Digital Transformation & Marketing Strategy for a Tiles Company" deck.
Node + Express on the back end, plain HTML, CSS and JavaScript on the front end. No database to install: data is kept in JSON files, so it runs on Windows without any build tools.

## Run it

```bash
npm install
npm start
```

Open http://localhost:3000. Use `npm run dev` to restart automatically when you edit files.

## What is built (mapped to the deck)

| Deck item | Where it lives |
|---|---|
| Home page: latest collections, featured tiles, offers, introduction | `/` |
| Product catalogue: floor, wall, bathroom, kitchen, outdoor (36 products) | `/catalogue` |
| Smart filters: size, colour, finish, material, price, application | `/catalogue` (plus search, sort, load more) |
| Compare tiles | Compare button on any card, up to 3 |
| Room-wise recommendations | `/rooms` (rule-based, explains why) |
| Product details: images, specs, price, enquiry | `/product/<slug>` (includes a quantity calculator) |
| Enquiry system: Get a Quote button, online form, WhatsApp | quote dialog on each tile, `/contact`, floating WhatsApp button |
| Customer reviews | on each product page |
| Store finder | `/stores` (search, "use my location", map, directions) |
| Offers | `/offers` |
| Target customers (homeowners, designers, builders, dealers) | home page, enquiry form "I am a" field |
| SEO: meta tags, local SEO | per-page titles and descriptions, product structured data, LocalBusiness data on home, `sitemap.xml`, `robots.txt` |
| Staff view of leads | `/admin` (enquiries with status, review moderation) |

## Change these first

1. `config.js`: brand name, WhatsApp number (digits only, country code first), phone, email, `siteUrl`.
2. `data/stores.json`: replace the sample stores with the real ones (coordinates are used for the map and "nearest store").
3. `data/products.json`: the real catalogue. It is generated from the table in `scripts/seed.js`; edit the table and run `npm run seed`, or edit the JSON directly. Prices are per sqm.
4. `data/reviews.json`: these are sample reviews. Delete them before launch (or use `/admin`).
5. Set an admin key before putting the site online:
   - Windows PowerShell: `$env:ADMIN_KEY="something-long"; npm start`
   - Mac/Linux: `ADMIN_KEY=something-long npm start`
6. Set `SITE_URL` to the real domain so canonical links and the sitemap are correct.

The contact details, store addresses and reviews that ship with the project are sample data.

## About the tile pictures

There are no photos in this project. Each tile is drawn as an SVG swatch from its `pattern`, `hex` and `hex2` fields (see `public/js/tile-art.js`). Swatches show pattern and finish, not exact colour. To use real photos, add an `image` field to the products and show it in `FX.card` (`public/js/main.js`) and `product.js`.

## Folder map

```
server.js            Express setup, page routes, sitemap
config.js            business details
routes/api.js        all /api endpoints (products, reviews, enquiries, stores, admin)
lib/db.js            JSON file storage
lib/catalogue.js     offers, prices, ratings
lib/recommend.js     room rules and scoring
lib/render.js        page templates and SEO tags
views/               HTML pages, partials in views/partials
public/css/style.css all styles (colours from the deck)
public/js/           main.js (shared), tile-art.js, one script per page
data/                products, reviews, stores, enquiries
scripts/seed.js      builds products.json
```

## API quick reference

- `GET /api/products?category=&q=&size=&colour=&finish=&material=&application=&minPrice=&maxPrice=&offer=1&sort=&limit=&offset=`
- `GET /api/products/:slug` (product, reviews, related)
- `GET /api/rooms`, `GET /api/recommend?room=bathroom&colour=&maxPrice=`
- `GET /api/reviews`, `POST /api/reviews`
- `POST /api/enquiries`
- `GET /api/stores?q=`
- `/api/admin/*` needs the `x-admin-key` header

Forms are rate limited (5 per 10 minutes per visitor), have a hidden spam trap field and are validated on the server.

## Notes for production

- JSON files are fine for a small site. If enquiries grow into the thousands, move them to a real database.
- Run behind HTTPS and a reverse proxy (Nginx, or a host like Render or Railway).
- Prices and offers are read from the data files, so offers expire automatically on their `offerEnds` date.
