CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION search_key(value text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT ' ' || trim(regexp_replace(
           regexp_replace(
             translate(
               replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
                 lower(coalesce(value, '')),
                 'щ', 'sh'), 'ш', 'sh'), 'ч', 'ch'), 'ц', 'ts'), 'я', 'ia'), 'ю', 'iu'),
                 'x', 'ks'), 'kh', 'h'), 'ph', 'f'), 'zh', 'j'), 'ck', 'k'),
               'абвгдеёжзийклмнопрстуфхыэәғқңөұүһіqwcyъь',
               'abvgdeejziiklmnoprstufhieagknouuhikvki'
             ),
             '[^a-z0-9]+', ' ', 'g'
           ),
           '(.)\1+', '\1', 'g'
         ))
$$;

CREATE TABLE IF NOT EXISTS company_search (
  bin text NOT NULL,
  name text NOT NULL,
  key text NOT NULL,
  is_current boolean NOT NULL
);

CREATE OR REPLACE FUNCTION rebuild_company_search() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  TRUNCATE company_search;
  INSERT INTO company_search (bin, name, key, is_current)
  SELECT bin, name, search_key(name), bool_or(is_current)
    FROM (
      SELECT bin, name_ru AS name, true AS is_current FROM companies
      UNION ALL
      SELECT bin, name_kk, true FROM companies
      UNION ALL
      SELECT p.bin, n.name_ru, false FROM company_periods p JOIN company_names n ON n.id = p.name_id
      UNION ALL
      SELECT p.bin, n.name_kk, false FROM company_periods p JOIN company_names n ON n.id = p.name_id
    ) x
   WHERE name IS NOT NULL AND name <> ''
   GROUP BY bin, name;
END;
$$;

SELECT rebuild_company_search();

CREATE INDEX IF NOT EXISTS company_search_name_trgm ON company_search USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS company_search_key_trgm ON company_search USING gin (key gin_trgm_ops);
CREATE INDEX IF NOT EXISTS company_search_bin ON company_search (bin);

ANALYZE company_search;