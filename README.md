# Fixton Tiles - Smart Digital Tiles Platform

A full-stack digital tiles platform developed as an internship project. The platform makes it easier for customers to explore tile collections, filter products, compare tiles, get room-wise recommendations, view product details, and submit enquiries online.

The project is built using **Node.js, Express.js, HTML, CSS, and JavaScript**, with JSON-based data storage for simple local development and demonstration.

---

## Project Overview

Fixton Tiles is designed as a digital platform for a tiles company to reduce dependence on physical showroom visits and provide customers with an easier way to explore tile products online.

The platform focuses on:

* Digital product catalogue
* Smart product filtering
* Tile comparison
* Room-wise recommendations
* Product specifications and pricing
* Online enquiries and quote requests
* WhatsApp enquiry integration
* Customer reviews
* Store finder
* Offers and featured products
* Basic admin enquiry management
* SEO-friendly pages

---

## Project Highlights

* Responsive website design
* 36 tile products in the demo catalogue
* Search, filtering and sorting
* Compare up to 3 tiles
* Room-wise tile recommendations
* Product quantity calculator
* Product reviews
* Online enquiry / quote forms
* WhatsApp integration
* Store finder with location support
* Offers section
* Admin enquiry management
* Server-side form validation
* Rate limiting for forms
* Spam-trap protection
* SEO meta tags and structured data
* Sitemap and robots.txt

---

## Main Features

### 1. Home Page

The home page provides an overview of the platform and includes:

* Featured tiles
* Latest collections
* Offers
* Company introduction
* Target customer information
* Calls to action for exploring products and submitting enquiries

Route:

```text
/
```

---

### 2. Product Catalogue

The catalogue contains demo products covering different applications:

* Floor Tiles
* Wall Tiles
* Bathroom Tiles
* Kitchen Tiles
* Outdoor Tiles

The catalogue currently contains **36 demo products**.

Route:

```text
/catalogue
```

Users can:

* Search products
* Filter by category
* Filter by size
* Filter by colour
* Filter by finish
* Filter by material
* Filter by application
* Filter by price
* Sort products
* Load more products
* Compare tiles

---

### 3. Tile Comparison

Users can select tiles from the catalogue and compare up to **3 products**.

The comparison feature helps users evaluate products before making an enquiry.

---

### 4. Room-Wise Recommendations

The platform provides rule-based recommendations according to the selected room.

Supported use cases include:

* Bathroom
* Kitchen
* Living room
* Bedroom
* Other supported room categories

The recommendation system also explains why a product is recommended.

Route:

```text
/rooms
```

---

### 5. Product Details

Each product has its own detail page containing:

* Product name
* Product information
* Specifications
* Size
* Colour
* Finish
* Material
* Application
* Price
* Rating
* Reviews
* Related products
* Enquiry option
* Quantity calculator

Route:

```text
/product/<slug>
```

---

### 6. Enquiry and Quote System

Customers can submit enquiries through the website.

The platform includes:

* Get a Quote
* Product enquiry
* Contact form
* Customer type selection
* WhatsApp enquiry
* Server-side validation
* Basic rate limiting
* Hidden spam-trap field

Contact page:

```text
/contact
```

---

### 7. Customer Reviews

Customers can view reviews associated with products and submit new reviews through the review system.

The demo reviews are stored in:

```text
data/reviews.json
```

---

### 8. Store Finder

The store finder allows users to search available stores and view store information.

Features include:

* Store search
* Store locations
* Map support
* Use my location
* Directions
* Nearest-store functionality

Route:

```text
/stores
```

---

### 9. Offers

The offers page displays available tile offers and promotional products.

Route:

```text
/offers
```

Offers are managed through the project data files.

---

### 10. Admin View

The project includes a basic admin interface for viewing and managing enquiries.

Route:

```text
/admin
```

Admin API endpoints require an admin key through the request header.

```text
x-admin-key
```

---

## Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript
* Responsive design
* SVG-based tile artwork

### Backend

* Node.js
* Express.js

### Data Storage

* JSON files

### Other Technologies / Services

* Leaflet / map support
* WhatsApp integration
* REST API
* SEO metadata
* Structured data
* Sitemap
* Robots.txt

---

## Project Structure

```text
fixton-tiles/
│
├── config.js
├── server.js
├── package.json
├── package-lock.json
├── README.md
│
├── data/
│   ├── enquiries.json
│   ├── products.json
│   ├── reviews.json
│   └── stores.json
│
├── lib/
│   ├── catalogue.js
│   ├── db.js
│   ├── recommend.js
│   └── render.js
│
├── routes/
│   └── api.js
│
├── scripts/
│   └── seed.js
│
├── public/
│   ├── css/
│   │   └── style.css
│   │
│   ├── js/
│   │   ├── admin.js
│   │   ├── catalogue.js
│   │   ├── home.js
│   │   ├── main.js
│   │   ├── offers.js
│   │   ├── product.js
│   │   ├── rooms.js
│   │   ├── stores.js
│   │   └── tile-art.js
│   │
│   └── favicon.svg
│
└── views/
    ├── 404.html
    ├── about.html
    ├── admin.html
    ├── catalogue.html
    ├── contact.html
    ├── index.html
    ├── offers.html
    ├── product.html
    ├── rooms.html
    ├── stores.html
    │
    └── partials/
        ├── enquiry-fields.html
        ├── footer.html
        ├── head.html
        ├── header.html
        └── scripts.html
```

---

## How to Run Locally

### Prerequisites

Make sure Node.js and npm are installed.

Check:

```bash
node -v
npm -v
```

### Install Dependencies

Open the project folder in PowerShell or terminal and run:

```bash
npm install
```

### Start the Project

```bash
npm start
```

The website will normally be available at:

```text
http://localhost:3000
```

### Development Mode

For automatic restart during development:

```bash
npm run dev
```

---

## API Quick Reference

### Products

```text
GET /api/products
```

Supports filters such as:

```text
category
q
size
colour
finish
material
application
minPrice
maxPrice
offer
sort
limit
offset
```

### Product Details

```text
GET /api/products/:slug
```

Returns product information, reviews and related products.

### Rooms

```text
GET /api/rooms
```

### Recommendations

```text
GET /api/recommend?room=bathroom&colour=&maxPrice=
```

### Reviews

```text
GET /api/reviews
POST /api/reviews
```

### Enquiries

```text
POST /api/enquiries
```

### Stores

```text
GET /api/stores?q=
```

### Admin

```text
/api/admin/*
```

Admin endpoints require the:

```text
x-admin-key
```

request header.

---

## Configuration

Project-level configuration is available in:

```text
config.js
```

The configuration can be used for:

* Brand name
* WhatsApp number
* Phone number
* Email
* Website URL

For deployment, sensitive admin credentials should be provided through environment variables rather than stored directly in source code.

Example for Windows PowerShell:

```powershell
$env:ADMIN_KEY="your-secure-admin-key"
npm start
```

For Mac/Linux:

```bash
ADMIN_KEY=your-secure-admin-key npm start
```

---

## Demo Data

The project currently contains demonstration data for:

* Products
* Stores
* Reviews
* Enquiries

Product data:

```text
data/products.json
```

Store data:

```text
data/stores.json
```

Review data:

```text
data/reviews.json
```

Enquiry data:

```text
data/enquiries.json
```

The included contact details, store information and reviews are sample data intended for project demonstration.

---

## Tile Artwork

The current demo uses generated **SVG tile swatches** instead of external product photographs.

Tile appearance is generated using product properties such as:

* Pattern
* Primary colour
* Secondary colour
* Finish

The artwork logic is available in:

```text
public/js/tile-art.js
```

Real product photography can be added later by introducing image fields to the product data and displaying them in the product cards and product detail pages.

---

## Product Data

Product data is stored in:

```text
data/products.json
```

The project also contains:

```text
scripts/seed.js
```

which can be used to generate the product catalogue from the defined product data.

If the seed script is configured in the project, it can be run using:

```bash
npm run seed
```

---

## Security and Validation

The project includes basic security and validation measures for demonstration purposes.

These include:

* Server-side form validation
* Request rate limiting
* Hidden spam-trap field
* Admin key protection
* Input validation for enquiries
* Basic URL and email validation
* Duplicate application/enquiry checks where applicable

For production deployment, additional security hardening would be recommended.

---

## SEO

The project includes several SEO-related features:

* Page-specific titles
* Meta descriptions
* Canonical URLs
* Product structured data
* LocalBusiness structured data
* Sitemap
* Robots.txt
* Product-specific metadata

The website URL should be updated in the project configuration before deployment so canonical URLs and sitemap entries use the correct domain.

---

## Project Flow

The basic customer journey is:

```text
Visit Website
      ↓
Explore Collections
      ↓
Search / Filter Products
      ↓
Compare Tiles
      ↓
View Product Details
      ↓
Get Room Recommendations
      ↓
Submit Enquiry / Request Quote
      ↓
WhatsApp / Sales Contact
      ↓
Purchase
```

---

## Future Improvements

The current project is designed as an internship/demo implementation. Possible future improvements include:

* Replace JSON storage with a production database
* Add real product photography
* Add company-specific product and store information
* Add user authentication
* Add a production-ready admin dashboard
* Connect enquiries with an email or CRM service
* Add advanced analytics
* Improve production-level security
* Deploy with HTTPS and environment-based configuration

---

## Internship Project

This project was developed as part of a **full-stack web development internship project**.

The implementation focuses on converting a tiles company's digital transformation requirements into a working web platform with product discovery, recommendations, enquiry management and store-related features.

---

## License

This project is intended for educational and internship demonstration purposes.
