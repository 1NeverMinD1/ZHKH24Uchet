CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS companies_bin_trgm ON companies USING gin (bin gin_trgm_ops);
CREATE INDEX IF NOT EXISTS companies_name_ru_lower_trgm ON companies USING gin (LOWER(CAST(name_ru AS VARCHAR)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS companies_name_kk_lower_trgm ON companies USING gin (LOWER(CAST(name_kk AS VARCHAR)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS companies_name_ru_idx ON companies (name_ru);
ANALYZE companies;