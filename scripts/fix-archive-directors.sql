ALTER TABLE company_periods ADD COLUMN IF NOT EXISTS director_id_archive bigint;

UPDATE company_periods
   SET director_id_archive = director_id
 WHERE from_on < '2023-08-01'
   AND director_id_archive IS NULL;

WITH target AS (
  SELECT DISTINCT ON (bin) bin, director_id
    FROM company_periods
   WHERE '2023-08-01'::date BETWEEN from_on AND to_on
   ORDER BY bin, from_on
)
UPDATE company_periods p
   SET director_id = t.director_id
  FROM target t
 WHERE p.bin = t.bin
   AND p.from_on < '2023-08-01'
   AND p.director_id IS DISTINCT FROM t.director_id;

WITH gone AS (
  SELECT bin
    FROM company_periods
   GROUP BY bin
  HAVING max(to_on) < '2023-08-01'
),
target AS (
  SELECT DISTINCT ON (p.bin) p.bin, p.director_id
    FROM company_periods p
    JOIN gone g ON g.bin = p.bin
   ORDER BY p.bin, p.to_on DESC
)
UPDATE company_periods p
   SET director_id = t.director_id
  FROM target t
 WHERE p.bin = t.bin
   AND p.director_id IS DISTINCT FROM t.director_id;

TRUNCATE snapshot_diffs, snapshot_diff_pairs, period_summary, period_pairs;