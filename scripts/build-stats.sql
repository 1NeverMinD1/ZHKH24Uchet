WITH latest AS (
  SELECT max(taken_on) AS taken_on FROM snapshots WHERE NOT is_test
),
seen AS (
  SELECT bin, max(to_on) AS last_seen FROM company_periods GROUP BY bin
)
UPDATE companies c
   SET last_seen = seen.last_seen,
       status = CASE WHEN seen.last_seen = (SELECT taken_on FROM latest) THEN 'active' ELSE 'gone' END
  FROM seen
 WHERE seen.bin = c.bin
   AND (c.last_seen IS DISTINCT FROM seen.last_seen
        OR c.status IS DISTINCT FROM
           CASE WHEN seen.last_seen = (SELECT taken_on FROM latest) THEN 'active' ELSE 'gone' END);

ANALYZE companies;

DROP TABLE IF EXISTS stats_todo;

CREATE TEMP TABLE stats_todo AS
WITH ordered AS (
  SELECT id, taken_on, has_codes,
         lag(id) OVER (ORDER BY taken_on) AS prev_id,
         lag(taken_on) OVER (ORDER BY taken_on) AS prev_on,
         lag(has_codes) OVER (ORDER BY taken_on) AS prev_codes
    FROM snapshots
   WHERE NOT is_test
)
SELECT * FROM ordered o
 WHERE NOT EXISTS (SELECT 1 FROM snapshot_stats st WHERE st.snapshot_id = o.id);

INSERT INTO snapshot_stats (snapshot_id, previous_id, total)
SELECT t.id, t.prev_id,
       (SELECT count(*) FROM company_periods p
         WHERE p.from_on <= t.taken_on AND p.to_on >= t.taken_on)
  FROM stats_todo t;

UPDATE snapshot_stats st
   SET appeared = (
         SELECT count(*) FROM company_periods e
          WHERE e.from_on = t.taken_on
            AND NOT EXISTS (
              SELECT 1 FROM company_periods b
               WHERE b.bin = e.bin AND b.to_on = t.prev_on)),
       disappeared = (
         SELECT count(*) FROM company_periods b
          WHERE b.to_on = t.prev_on
            AND NOT EXISTS (
              SELECT 1 FROM company_periods e
               WHERE e.bin = b.bin AND e.from_on = t.taken_on))
  FROM stats_todo t
 WHERE st.snapshot_id = t.id
   AND t.prev_id IS NOT NULL;

UPDATE snapshot_stats st
   SET changed = x.changed,
       changes = jsonb_build_object(
         'name', x.name,
         'director', x.director,
         'address', x.address,
         'oked', x.oked,
         'secondary_oked', x.secondary_oked,
         'krp', x.krp,
         'kse', x.kse,
         'kfs', x.kfs)
  FROM (
    SELECT snapshot_id,
           count(*) FILTER (WHERE name) AS name,
           count(*) FILTER (WHERE director) AS director,
           count(*) FILTER (WHERE address) AS address,
           count(*) FILTER (WHERE oked) AS oked,
           count(*) FILTER (WHERE secondary_oked) AS secondary_oked,
           count(*) FILTER (WHERE krp) AS krp,
           count(*) FILTER (WHERE kse) AS kse,
           count(*) FILTER (WHERE kfs) AS kfs,
           count(*) FILTER (WHERE name OR director OR address OR oked
                                  OR secondary_oked OR krp OR kse OR kfs) AS changed
      FROM (
        SELECT t.id AS snapshot_id,
               b.name_id IS DISTINCT FROM e.name_id AS name,
               b.director_id IS DISTINCT FROM e.director_id AS director,
               b.address_id IS DISTINCT FROM e.address_id AS address,
               b.oked_code IS DISTINCT FROM e.oked_code AS oked,
               b.secondary_oked IS DISTINCT FROM e.secondary_oked AS secondary_oked,
               b.krp_code IS DISTINCT FROM e.krp_code AS krp,
               (t.has_codes AND t.prev_codes AND b.kse_code IS DISTINCT FROM e.kse_code) AS kse,
               (t.has_codes AND t.prev_codes AND b.kfs_code IS DISTINCT FROM e.kfs_code) AS kfs
          FROM stats_todo t
          JOIN company_periods e ON e.from_on = t.taken_on
          JOIN company_periods b ON b.bin = e.bin AND b.to_on = t.prev_on
          LEFT JOIN company_names nb ON nb.id = b.name_id
          LEFT JOIN company_names ne ON ne.id = e.name_id
         WHERE t.prev_id IS NOT NULL
      ) flags
     GROUP BY snapshot_id
  ) x
 WHERE st.snapshot_id = x.snapshot_id;

UPDATE snapshot_stats st
   SET by_form = x.data
  FROM (
    SELECT snapshot_id,
           jsonb_object_agg(form, jsonb_build_object('total', total, 'appeared', appeared)) AS data
      FROM (
        SELECT t.id AS snapshot_id,
               coalesce(c.legal_form, 'other') AS form,
               count(*) AS total,
               count(*) FILTER (WHERE t.prev_id IS NOT NULL
                                  AND p.from_on = t.taken_on
                                  AND NOT EXISTS (
                                    SELECT 1 FROM company_periods b
                                     WHERE b.bin = p.bin AND b.to_on = t.prev_on)) AS appeared
          FROM stats_todo t
          JOIN company_periods p ON p.from_on <= t.taken_on AND p.to_on >= t.taken_on
          LEFT JOIN companies c ON c.bin = p.bin
         GROUP BY t.id, coalesce(c.legal_form, 'other')
      ) g
     GROUP BY snapshot_id
  ) x
 WHERE st.snapshot_id = x.snapshot_id;

UPDATE snapshot_stats st
   SET by_region = x.data
  FROM (
    SELECT snapshot_id,
           jsonb_object_agg(region, jsonb_build_object('total', total, 'appeared', appeared)) AS data
      FROM (
        SELECT t.id AS snapshot_id,
               coalesce(left(tr.kato, 2), '00') AS region,
               count(*) AS total,
               count(*) FILTER (WHERE t.prev_id IS NOT NULL
                                  AND p.from_on = t.taken_on
                                  AND NOT EXISTS (
                                    SELECT 1 FROM company_periods b
                                     WHERE b.bin = p.bin AND b.to_on = t.prev_on)) AS appeared
          FROM stats_todo t
          JOIN company_periods p ON p.from_on <= t.taken_on AND p.to_on >= t.taken_on
          LEFT JOIN addresses a ON a.id = p.address_id
          LEFT JOIN territories tr ON tr.id = a.territory_id
         GROUP BY t.id, coalesce(left(tr.kato, 2), '00')
      ) g
     GROUP BY snapshot_id
  ) x
 WHERE st.snapshot_id = x.snapshot_id;

DROP TABLE stats_todo;

SELECT s.taken_on, st.total, st.appeared, st.disappeared, st.changed
  FROM snapshot_stats st
  JOIN snapshots s ON s.id = st.snapshot_id
 ORDER BY s.taken_on;