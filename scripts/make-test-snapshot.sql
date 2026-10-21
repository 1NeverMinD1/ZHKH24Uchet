BEGIN;

INSERT INTO snapshots (taken_on, source, is_test)
VALUES (:'test_date', 'synthetic test data', true);

WITH base AS (
  SELECT id FROM snapshots
   WHERE is_test = false AND taken_on > :'test_date'
   ORDER BY taken_on ASC
   LIMIT 1
), target AS (
  SELECT id FROM snapshots WHERE taken_on = :'test_date'
), limits AS (
  SELECT (SELECT max(id) FROM directors) AS max_director,
         (SELECT max(id) FROM addresses) AS max_address
)
INSERT INTO company_states (snapshot_id, bin, director_id, address_id, unit)
SELECT (SELECT id FROM target),
       cs.bin,
       CASE WHEN random() < 0.03
            THEN 1 + floor(random() * l.max_director)::int
            ELSE cs.director_id END,
       CASE WHEN random() < 0.02
            THEN 1 + floor(random() * l.max_address)::int
            ELSE cs.address_id END,
       cs.unit
  FROM company_states cs, limits l
 WHERE cs.snapshot_id = (SELECT id FROM base)
   AND random() > 0.02;

UPDATE snapshots
   SET rows_total = (SELECT count(*) FROM company_states WHERE snapshot_id = snapshots.id)
 WHERE taken_on = :'test_date';

COMMIT;
ANALYZE company_states;