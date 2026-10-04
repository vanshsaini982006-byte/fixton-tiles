// All the business details live here so they are easy to change.
// Anything that looks like contact info is sample data - swap in the real ones.

module.exports = {
  brand: 'Fixton Tiles',
  tagline: 'Timeless Tiles. Beautiful Spaces.',

  port: process.env.PORT || 3000,
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',

  // WhatsApp number in international format, digits only (no + or spaces)
  whatsapp: '7668091800',
  phone: '+91 7668091800',
  email: 'vanshsaini982006@gmail.com',

  // Prices in the catalogue are per square metre
  currency: '\u20B9',

  // Used by the /admin page. Set ADMIN_KEY in your environment before you deploy.
  adminKey: process.env.ADMIN_KEY || 'fixton-admin'
};
