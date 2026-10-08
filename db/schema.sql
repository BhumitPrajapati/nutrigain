-- NutriGain relational schema (PostgreSQL 14+). Equivalent to prisma/schema.prisma.
-- All food nutrient columns are per 100 g.

CREATE TYPE sex_t            AS ENUM ('male', 'female');
CREATE TYPE activity_t       AS ENUM ('sedentary', 'light', 'moderate', 'very_active', 'extra_active');
CREATE TYPE surplus_t        AS ENUM ('lean', 'standard', 'aggressive');
CREATE TYPE diet_pref_t      AS ENUM ('omnivore', 'vegetarian', 'vegan');
CREATE TYPE meal_slot_t      AS ENUM ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout');
CREATE TYPE supplement_kind_t AS ENUM ('creatine', 'whey', 'multivitamin', 'omega3', 'other');

CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  sex          sex_t NOT NULL,
  birth_date   DATE NOT NULL,
  height_cm    NUMERIC(5,1) NOT NULL CHECK (height_cm BETWEEN 120 AND 230),
  weight_kg    NUMERIC(5,1) NOT NULL CHECK (weight_kg BETWEEN 30 AND 250),
  activity     activity_t NOT NULL,
  surplus_mode surplus_t NOT NULL DEFAULT 'standard',
  diet_pref    diet_pref_t NOT NULL DEFAULT 'omnivore',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grams -> macros mapping. owner_id NULL = shared catalogue, otherwise a user's custom food.
CREATE TABLE foods (
  id            TEXT PRIMARY KEY,
  owner_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  diet          TEXT NOT NULL CHECK (diet IN ('v','vg','o')),  -- vegan, vegetarian, omnivore
  kcal          NUMERIC(6,1) NOT NULL,
  protein_g     NUMERIC(5,1) NOT NULL,
  carbs_g       NUMERIC(5,1) NOT NULL,
  fat_g         NUMERIC(5,1) NOT NULL,
  fiber_g       NUMERIC(5,1) NOT NULL DEFAULT 0,
  calcium_mg    NUMERIC(6,1) NOT NULL DEFAULT 0,
  iron_mg       NUMERIC(5,1) NOT NULL DEFAULT 0,
  potassium_mg  NUMERIC(6,1) NOT NULL DEFAULT 0,
  serving_g     NUMERIC(6,1) NOT NULL DEFAULT 100,
  serving_label TEXT NOT NULL DEFAULT '100 g',
  min_portion_g NUMERIC(6,1) NOT NULL DEFAULT 50,
  max_portion_g NUMERIC(6,1) NOT NULL DEFAULT 300
);
CREATE INDEX foods_name_idx ON foods (lower(name));

-- One row per user per day. Targets are frozen so history survives profile edits.
CREATE TABLE daily_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date         DATE NOT NULL,
  target_kcal      INT NOT NULL,
  target_protein_g INT NOT NULL,
  target_carbs_g   INT NOT NULL,
  target_fat_g     INT NOT NULL,
  target_water_ml  INT NOT NULL,
  water_ml         INT NOT NULL DEFAULT 0 CHECK (water_ml >= 0),
  UNIQUE (user_id, log_date)
);

CREATE TABLE meal_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id  UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  food_id       TEXT NOT NULL REFERENCES foods(id),
  slot          meal_slot_t NOT NULL DEFAULT 'snack',
  grams         NUMERIC(6,1) NOT NULL CHECK (grams > 0 AND grams <= 2000),
  eaten_at      TIMESTAMPTZ NOT NULL,
  -- snapshot so later edits to a food never rewrite history
  kcal NUMERIC(7,1) NOT NULL, protein_g NUMERIC(6,1) NOT NULL, carbs_g NUMERIC(6,1) NOT NULL, fat_g NUMERIC(6,1) NOT NULL
);
CREATE INDEX meal_entries_log_idx ON meal_entries (daily_log_id, eaten_at);

CREATE TABLE supplements (
  id         TEXT PRIMARY KEY,
  kind       supplement_kind_t NOT NULL,
  name       TEXT NOT NULL,
  dose_g     NUMERIC(6,1) NOT NULL,
  dose_label TEXT NOT NULL,
  food_id    TEXT REFERENCES foods(id),     -- whey links to its food row so macros count
  micros     JSONB                            -- e.g. {"calciumMg":200,"ironMg":8}
);

CREATE TABLE supplement_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id  UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  supplement_id TEXT NOT NULL REFERENCES supplements(id),
  doses         NUMERIC(4,1) NOT NULL DEFAULT 1,
  taken_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE monthly_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_start    DATE NOT NULL,
  avg_kcal       NUMERIC(7,1) NOT NULL,
  avg_protein_g  NUMERIC(6,1) NOT NULL,
  days_logged    INT NOT NULL,
  days_on_target INT NOT NULL,
  avg_weight_kg  NUMERIC(5,1),
  UNIQUE (user_id, month_start)
);

CREATE TABLE recommendations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id  UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  gap_kcal NUMERIC(7,1) NOT NULL, gap_protein_g NUMERIC(6,1) NOT NULL, gap_carbs_g NUMERIC(6,1) NOT NULL, gap_fat_g NUMERIC(6,1) NOT NULL,
  items         JSONB NOT NULL,             -- [{"foodId":"greek_yogurt","grams":200}]
  score         NUMERIC(3,2) NOT NULL,
  accepted      BOOLEAN NOT NULL DEFAULT false
);

-- Roll a month of daily logs into monthly_logs (run nightly or on demand).
CREATE VIEW daily_totals AS
SELECT d.id AS daily_log_id, d.user_id, d.log_date,
       COALESCE(SUM(m.kcal),0) AS kcal, COALESCE(SUM(m.protein_g),0) AS protein_g,
       COALESCE(SUM(m.carbs_g),0) AS carbs_g, COALESCE(SUM(m.fat_g),0) AS fat_g,
       d.target_kcal, d.target_protein_g, d.water_ml, d.target_water_ml
FROM daily_logs d LEFT JOIN meal_entries m ON m.daily_log_id = d.id
GROUP BY d.id;

INSERT INTO monthly_logs (user_id, month_start, avg_kcal, avg_protein_g, days_logged, days_on_target)
SELECT user_id, date_trunc('month', log_date)::date, AVG(kcal), AVG(protein_g), COUNT(*),
       COUNT(*) FILTER (WHERE protein_g >= target_protein_g * 0.9 AND kcal BETWEEN target_kcal * 0.9 AND target_kcal * 1.2)
FROM daily_totals
WHERE log_date >= date_trunc('month', now()) - interval '1 month'
GROUP BY user_id, date_trunc('month', log_date)
ON CONFLICT (user_id, month_start) DO UPDATE
  SET avg_kcal = EXCLUDED.avg_kcal, avg_protein_g = EXCLUDED.avg_protein_g,
      days_logged = EXCLUDED.days_logged, days_on_target = EXCLUDED.days_on_target;
