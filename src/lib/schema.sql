-- BeeD Energy marketplace schema (SQLite via node:sqlite).
-- Money is stored as whole lekë (ALL), VAT included, because Albanian shops quote prices with TVSH.
-- Every row a seed invents is marked is_demo = 1 so it can be listed and removed before launch.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  slug_sq TEXT NOT NULL UNIQUE,
  slug_en TEXT NOT NULL UNIQUE,
  name_sq TEXT NOT NULL,
  name_en TEXT NOT NULL,
  group_key TEXT NOT NULL DEFAULT 'energy',          -- 'energy' | 'efficiency' | 'build'
  intro_sq TEXT NOT NULL DEFAULT '',
  intro_en TEXT NOT NULL DEFAULT '',
  unit_basis TEXT,                                    -- spec key used for a normalised price, e.g. 'power_wp'
  unit_label_sq TEXT,                                 -- e.g. 'L/Wp'
  unit_label_en TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

-- The spec template of a category: which attributes its products carry.
CREATE TABLE IF NOT EXISTS spec_attributes (
  id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label_sq TEXT NOT NULL,
  label_en TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'number' CHECK (type IN ('number', 'text', 'enum', 'bool')),
  options_json TEXT NOT NULL DEFAULT '[]',            -- enum options [{value, sq, en}]
  filterable INTEGER NOT NULL DEFAULT 0,
  comparable INTEGER NOT NULL DEFAULT 1,
  highlight INTEGER NOT NULL DEFAULT 0,               -- shown on product cards
  required INTEGER NOT NULL DEFAULT 0,
  better TEXT CHECK (better IN ('higher', 'lower') OR better IS NULL),
  decimals INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  UNIQUE (category_id, key)
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  name_sq TEXT NOT NULL,
  name_en TEXT NOT NULL,
  summary_sq TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  body_sq TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  width_mm REAL,
  height_mm REAL,
  depth_mm REAL,
  weight_kg REAL,
  warranty_years REAL,
  datasheet_url TEXT,
  sources_json TEXT NOT NULL DEFAULT '[]',
  reference_price_eur REAL,                           -- public price found during research (not a sale price)
  reference_price_source TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS products_category ON products (category_id, status);

CREATE TABLE IF NOT EXISTS product_specs (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id INTEGER NOT NULL REFERENCES spec_attributes(id) ON DELETE CASCADE,
  value_num REAL,
  value_text TEXT,
  PRIMARY KEY (product_id, attribute_id)
);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_sq TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_sq TEXT NOT NULL,
  name_en TEXT NOT NULL,
  lat REAL,
  lon REAL,
  zone INTEGER NOT NULL DEFAULT 1,                    -- delivery zone: 1 Tirana-Durrës, 2 central, 3 far
  pv_yield REAL,                                      -- PVGIS kWh per kWp per year
  pv_monthly_json TEXT,
  pv_slope REAL,
  pv_azimuth REAL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sellers (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  legal_name TEXT,
  nipt TEXT,
  kind TEXT NOT NULL DEFAULT 'supplier' CHECK (kind IN ('supplier', 'installer', 'manufacturer', 'contractor')),
  city_id INTEGER REFERENCES cities(id),
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  about_sq TEXT NOT NULL DEFAULT '',
  about_en TEXT NOT NULL DEFAULT '',
  verified INTEGER NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'start' CHECK (plan IN ('start', 'pro', 'partner')),
  commission_pct REAL NOT NULL DEFAULT 8,
  rating REAL,
  rating_count INTEGER NOT NULL DEFAULT 0,
  delivery_zones TEXT NOT NULL DEFAULT '1,2,3',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  is_demo INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  price_all INTEGER NOT NULL CHECK (price_all > 0),   -- per unit, VAT included
  compare_at_all INTEGER,                             -- previous price when discounted
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  lead_days INTEGER NOT NULL DEFAULT 2,
  min_qty INTEGER NOT NULL DEFAULT 1,
  delivery_fee_all INTEGER NOT NULL DEFAULT 0,        -- per order to zone 1; zones 2-3 add the city surcharge
  free_delivery_over_all INTEGER,
  installation_available INTEGER NOT NULL DEFAULT 0,
  note_sq TEXT NOT NULL DEFAULT '',
  note_en TEXT NOT NULL DEFAULT '',
  promoted INTEGER NOT NULL DEFAULT 0,                -- paid placement (revenue model)
  active INTEGER NOT NULL DEFAULT 1,
  is_demo INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (product_id, seller_id)
);
CREATE INDEX IF NOT EXISTS offers_product ON offers (product_id, active, price_all);

-- Volume prices for trade buyers: from min_qty units, each unit costs price_all.
CREATE TABLE IF NOT EXISTS offer_tiers (
  offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  min_qty INTEGER NOT NULL CHECK (min_qty > 1),
  price_all INTEGER NOT NULL CHECK (price_all > 0),
  PRIMARY KEY (offer_id, min_qty)
);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY,
  offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  price_all INTEGER NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS price_history_offer ON price_history (offer_id, recorded_at);

CREATE TABLE IF NOT EXISTS price_alerts (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  target_all INTEGER NOT NULL,
  lang TEXT NOT NULL DEFAULT 'sq',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  notified_at TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,                                -- unguessable part of the customer's order link
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  customer_type TEXT NOT NULL DEFAULT 'individual' CHECK (customer_type IN ('individual', 'business')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  nipt TEXT,
  city_id INTEGER REFERENCES cities(id),
  address TEXT NOT NULL,
  notes TEXT,
  delivery_method TEXT NOT NULL DEFAULT 'courier' CHECK (delivery_method IN ('courier', 'pickup')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'bank', 'card')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_ref TEXT,
  subtotal_all INTEGER NOT NULL,
  delivery_all INTEGER NOT NULL,
  total_all INTEGER NOT NULL,
  vat_all INTEGER NOT NULL,                           -- VAT contained in total (20%)
  commission_all INTEGER NOT NULL DEFAULT 0,
  lang TEXT NOT NULL DEFAULT 'sq',
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS orders_created ON orders (created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  offer_id INTEGER REFERENCES offers(id) ON DELETE SET NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  unit_price_all INTEGER NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  line_total_all INTEGER NOT NULL,
  commission_pct REAL NOT NULL DEFAULT 0,
  commission_all INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  actor TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per seller parcel, written with the order: the delivery fee the buyer was charged for it.
-- Packing slips (cash due per courier) and the order pages read these instead of recomputing.
CREATE TABLE IF NOT EXISTS order_parcels (
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL,
  seller_name TEXT NOT NULL,
  subtotal_all INTEGER NOT NULL,
  fee_all INTEGER NOT NULL,
  free INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (order_id, seller_id)
);

-- Every card payment attempt at the provider (a retry makes a new POK order). orders.payment_ref keeps
-- the latest id for display; the webhook and the retry check look ids up here.
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
  amount_all INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS payments_order ON payments (order_id, created_at);

-- One-time token of a drawn checkout form: a second post of the same form finds it used and lands on
-- the order the first post created, instead of creating a second order.
CREATE TABLE IF NOT EXISTS checkout_nonces (
  nonce TEXT PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Request for quote: a buyer describes a project; sellers answer in the thread.
CREATE TABLE IF NOT EXISTS quote_requests (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'won', 'closed')),
  project_type TEXT NOT NULL,
  city_id INTEGER REFERENCES cities(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  nipt TEXT,
  details TEXT NOT NULL,
  budget_all INTEGER,
  items_json TEXT NOT NULL DEFAULT '[]',              -- optional product lines [{productId, qty}]
  lang TEXT NOT NULL DEFAULT 'sq',
  seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,  -- a visit request addressed to one installer
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  thread_type TEXT NOT NULL CHECK (thread_type IN ('rfq', 'order')),
  thread_id INTEGER NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('buyer', 'seller', 'admin')),
  seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  price_all INTEGER,                                  -- a seller's quoted price, when the message is an offer
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS messages_thread ON messages (thread_type, thread_id, created_at);

CREATE TABLE IF NOT EXISTS seller_applications (
  id INTEGER PRIMARY KEY,
  company TEXT NOT NULL,
  nipt TEXT,
  kind TEXT NOT NULL DEFAULT 'supplier',
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT,
  categories TEXT,
  plan TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  topic TEXT,
  body TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'sq',
  handled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'seller')),
  seller_id INTEGER REFERENCES sellers(id) ON DELETE CASCADE,
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                                -- sha256 of the cookie token
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id INTEGER,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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
