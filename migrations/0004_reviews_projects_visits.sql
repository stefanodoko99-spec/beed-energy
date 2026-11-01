-- 2026-11-01: verified reviews, the installation gallery, and visit requests sent to one installer.

-- A review can only be written from a delivered order's page (the order's token proves the buyer), once per
-- product per order; it waits for the shop team before it shows.
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'sq',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (order_id, product_id)
);
CREATE INDEX IF NOT EXISTS reviews_product ON reviews (product_id, status);
CREATE INDEX IF NOT EXISTS reviews_seller ON reviews (seller_id, status);

-- Real installations a seller has done, shown with the owner's consent; drafts stay in the admin.
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
  city_id INTEGER REFERENCES cities(id),
  kind TEXT NOT NULL DEFAULT 'home' CHECK (kind IN ('home', 'business', 'farm', 'public')),
  title_sq TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  story_sq TEXT NOT NULL DEFAULT '',
  story_en TEXT NOT NULL DEFAULT '',
  kwp REAL,
  battery_kwh REAL,
  year INTEGER,
  saving_all INTEGER,                                 -- the owner's yearly saving, as they reported it
  image TEXT,                                         -- media path (/media/...)
  consent INTEGER NOT NULL DEFAULT 0,                 -- the owner agreed to the photo and the figures being shown
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A visit request from the installer finder is a quote request addressed to one installer.
ALTER TABLE quote_requests ADD COLUMN seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL;
