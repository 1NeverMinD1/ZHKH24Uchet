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