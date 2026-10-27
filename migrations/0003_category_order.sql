-- Renewable energy first: the shop order scripts/catalog/categories.mjs gives since 2026-10-27 (commit c8eab61).
-- The shop, the menu and the footer read categories.sort, which only the seed sets, so a database seeded
-- before that commit keeps the old order until this runs.
--
-- All or nothing: the new order is applied only while all fourteen categories still sit where the first seed
-- put them. If anyone has moved even one in the admin (Kategoritë → Renditja), the whole order is left as they
-- set it, so the result is never half the old order and half the new. A database seeded from the current
-- categories.mjs already has the new order, does not match the old one either, and is left alone.

UPDATE categories
   SET sort = CASE slug_en
     WHEN 'solar-panels'        THEN 0
     WHEN 'inverters'           THEN 1
     WHEN 'batteries'           THEN 2
     WHEN 'heat-pumps'          THEN 3
     WHEN 'solar-water-heaters' THEN 4
     WHEN 'ev-chargers'         THEN 5
     WHEN 'energy-monitoring'   THEN 6
     WHEN 'mounting-systems'    THEN 7
     WHEN 'pv-accessories'      THEN 8
     WHEN 'air-conditioners'    THEN 9
     WHEN 'insulation'          THEN 10
     WHEN 'windows'             THEN 11
     WHEN 'led-lighting'        THEN 12
     WHEN 'cement-and-masonry'  THEN 13
     ELSE sort END
 WHERE slug_en IN ('solar-panels', 'inverters', 'batteries', 'heat-pumps', 'solar-water-heaters', 'ev-chargers', 'energy-monitoring',
                   'mounting-systems', 'pv-accessories', 'air-conditioners', 'insulation', 'windows', 'led-lighting', 'cement-and-masonry')
   AND (SELECT COUNT(*) FROM categories WHERE (slug_en, sort) IN (VALUES
         ('solar-panels', 0), ('inverters', 1), ('batteries', 2), ('ev-chargers', 3), ('mounting-systems', 4),
         ('pv-accessories', 5), ('heat-pumps', 6), ('air-conditioners', 7), ('solar-water-heaters', 8), ('insulation', 9),
         ('windows', 10), ('cement-and-masonry', 11), ('energy-monitoring', 12), ('led-lighting', 13))) = 14;
