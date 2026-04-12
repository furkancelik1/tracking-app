-- ═══════════════════════════════════════════════════════════════════════════════
-- Shop Items Seed Data — Themes, Frames & Boosters
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── THEMES ────────────────────────────────────────────────────────────────────

INSERT INTO "ShopItem" (id, name, description, price, category, "imageUrl", metadata, "isActive", "createdAt")
VALUES
  ('theme_ocean',      'Ocean Breeze',    'Cool blue tones inspired by the sea.',         200, 'THEME', NULL, '{"primary":"#0ea5e9","secondary":"#0284c7","accent":"#38bdf8"}', true, NOW()),
  ('theme_sunset',     'Sunset Glow',     'Warm orange-pink gradient vibes.',             200, 'THEME', NULL, '{"primary":"#f97316","secondary":"#ea580c","accent":"#fb923c"}', true, NOW()),
  ('theme_forest',     'Forest Walk',     'Earthy greens for a calm experience.',         200, 'THEME', NULL, '{"primary":"#22c55e","secondary":"#16a34a","accent":"#4ade80"}', true, NOW()),
  ('theme_lavender',   'Lavender Dream',  'Soft purple palette for late-night sessions.', 300, 'THEME', NULL, '{"primary":"#a855f7","secondary":"#9333ea","accent":"#c084fc"}', true, NOW()),
  ('theme_midnight',   'Midnight Gold',   'Dark luxury with golden highlights.',          500, 'THEME', NULL, '{"primary":"#eab308","secondary":"#ca8a04","accent":"#facc15"}', true, NOW()),
  ('theme_cherry',     'Cherry Blossom',  'Delicate pink inspired by spring.',            300, 'THEME', NULL, '{"primary":"#ec4899","secondary":"#db2777","accent":"#f472b6"}', true, NOW());

-- ─── FRAMES ────────────────────────────────────────────────────────────────────

INSERT INTO "ShopItem" (id, name, description, price, category, "imageUrl", metadata, "isActive", "createdAt")
VALUES
  ('frame_fire',       'Fire Ring',       'A blazing ring around your avatar.',           150, 'FRAME', NULL, '{"gradient":"from-orange-500 to-red-500"}',   true, NOW()),
  ('frame_ice',        'Ice Crown',       'Frosty crystal frame for cool vibes.',         150, 'FRAME', NULL, '{"gradient":"from-cyan-400 to-blue-500"}',    true, NOW()),
  ('frame_neon',       'Neon Pulse',      'Glowing neon border that stands out.',         250, 'FRAME', NULL, '{"gradient":"from-green-400 to-emerald-500"}', true, NOW()),
  ('frame_galaxy',     'Galaxy Swirl',    'Cosmic purple-blue animated frame.',           400, 'FRAME', NULL, '{"gradient":"from-purple-500 to-indigo-600"}', true, NOW()),
  ('frame_gold',       'Golden Legacy',   'Premium golden frame for legends.',            600, 'FRAME', NULL, '{"gradient":"from-yellow-400 to-amber-500"}',  true, NOW());

-- ─── BOOSTERS ──────────────────────────────────────────────────────────────────

INSERT INTO "ShopItem" (id, name, description, price, category, "imageUrl", metadata, "isActive", "createdAt")
VALUES
  ('booster_2x_coin',  '2× Coin Boost',   'Double coins for 24 hours.',                  300, 'BOOSTER', NULL, '{"multiplier":2,"durationHours":24}', true, NOW()),
  ('booster_2x_xp',    '2× XP Boost',     'Double XP for 24 hours.',                     300, 'BOOSTER', NULL, '{"multiplier":2,"durationHours":24}', true, NOW());

-- ON CONFLICT: re-runnable (upsert approach)
-- If you need idempotency, wrap each INSERT with ON CONFLICT (id) DO NOTHING
