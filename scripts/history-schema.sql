CREATE TABLE IF NOT EXISTS snapshots (
  id serial PRIMARY KEY,
  taken_on date NOT NULL UNIQUE,
  source text,
  is_test boolean NOT NULL DEFAULT false,
  rows_total integer,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS territories (
  id serial PRIMARY KEY,
  level smallint NOT NULL,
  kato varchar(9) NOT NULL,
  parent_id integer REFERENCES territories (id),
  name_ru text NOT NULL,
  name_kk text,
  path_ru text,
  path_kk text,
  UNIQUE (level, kato)
);

CREATE INDEX IF NOT EXISTS territories_parent_idx ON territories (parent_id);

CREATE TABLE IF NOT EXISTS directors (
  id serial PRIMARY KEY,
  name_key text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS addresses (
  id serial PRIMARY KEY,
  addr_key text NOT NULL UNIQUE,
  territory_id integer REFERENCES territories (id),
  street_type text,
  street text,
  house text,
  address text NOT NULL
);

CREATE INDEX IF NOT EXISTS addresses_territory_idx ON addresses (territory_id);

CREATE TABLE IF NOT EXISTS company_states (
  snapshot_id integer NOT NULL REFERENCES snapshots (id) ON DELETE CASCADE,
  bin varchar(12) NOT NULL,
  director_id integer REFERENCES directors (id),
  address_id integer REFERENCES addresses (id),
  unit text,
  PRIMARY KEY (snapshot_id, bin)
);

CREATE INDEX IF NOT EXISTS company_states_bin_idx ON company_states (bin, snapshot_id);
CREATE INDEX IF NOT EXISTS company_states_address_idx ON company_states (address_id, snapshot_id);
CREATE INDEX IF NOT EXISTS company_states_director_idx ON company_states (director_id, snapshot_id);

CREATE TABLE IF NOT EXISTS company_names (
  id serial PRIMARY KEY,
  bin varchar(12) NOT NULL,
  name_key text NOT NULL,
  name_ru text,
  name_kk text,
  UNIQUE (bin, name_key)
);

ALTER TABLE company_states ADD COLUMN IF NOT EXISTS name_id integer REFERENCES company_names (id);

ALTER TABLE company_states ADD COLUMN IF NOT EXISTS oked_code text;
ALTER TABLE company_states ADD COLUMN IF NOT EXISTS secondary_oked text;
ALTER TABLE company_states ADD COLUMN IF NOT EXISTS krp_code text;
ALTER TABLE company_states ADD COLUMN IF NOT EXISTS kse_code text;
ALTER TABLE company_states ADD COLUMN IF NOT EXISTS kfs_code text;

CREATE TABLE IF NOT EXISTS snapshot_diff_pairs (
  base_id integer NOT NULL REFERENCES snapshots (id) ON DELETE CASCADE,
  end_id integer NOT NULL REFERENCES snapshots (id) ON DELETE CASCADE,
  PRIMARY KEY (base_id, end_id)
);

CREATE TABLE IF NOT EXISTS snapshot_diffs (
  base_id integer NOT NULL,
  end_id integer NOT NULL,
  bin varchar(12) NOT NULL,
  kato varchar(9),
  name_ru text,
  name_kk text,
  unit text,
  name_from integer,
  name_to integer,
  director_from integer,
  director_to integer,
  address_from integer,
  address_to integer,
  oked_from text,
  oked_to text,
  secondary_from text,
  secondary_to text,
  krp_from text,
  krp_to text,
  kse_from text,
  kse_to text,
  kfs_from text,
  kfs_to text,
  changes text[] NOT NULL,
  PRIMARY KEY (base_id, end_id, bin),
  FOREIGN KEY (base_id, end_id) REFERENCES snapshot_diff_pairs (base_id, end_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS snapshot_diffs_changes_idx ON snapshot_diffs USING gin (changes);
CREATE INDEX IF NOT EXISTS snapshot_diffs_kato_idx ON snapshot_diffs (base_id, end_id, kato text_pattern_ops);

CREATE TABLE IF NOT EXISTS snapshot_stats (
  snapshot_id integer PRIMARY KEY REFERENCES snapshots (id) ON DELETE CASCADE,
  previous_id integer REFERENCES snapshots (id) ON DELETE SET NULL,
  total integer NOT NULL,
  appeared integer,
  disappeared integer,
  changed integer,
  changes jsonb,
  by_form jsonb,
  by_region jsonb
);