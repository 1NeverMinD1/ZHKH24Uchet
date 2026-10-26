CREATE INDEX IF NOT EXISTS companies_sort_name_idx ON companies (sort_name);
CREATE INDEX IF NOT EXISTS companies_legal_form_idx ON companies (legal_form, sort_name);
CREATE INDEX IF NOT EXISTS companies_kato_prefix_idx ON companies (kato text_pattern_ops);
CREATE INDEX IF NOT EXISTS companies_oked_prefix_idx ON companies (oked_code text_pattern_ops);
CREATE INDEX IF NOT EXISTS companies_krp_idx ON companies (krp_code);
CREATE INDEX IF NOT EXISTS companies_kse_idx ON companies (kse_code);
CREATE INDEX IF NOT EXISTS companies_kfs_idx ON companies (kfs_code);
CREATE INDEX IF NOT EXISTS companies_registration_idx ON companies (registration_date);
CREATE INDEX IF NOT EXISTS companies_status_idx ON companies (status);
ANALYZE companies;

SELECT legal_form, count(*) FROM companies GROUP BY legal_form ORDER BY count(*) DESC;

SELECT name_ru, sort_name FROM companies WHERE legal_form = 'other' ORDER BY random() LIMIT 30;

SELECT name_ru, sort_name FROM companies ORDER BY sort_name LIMIT 15;