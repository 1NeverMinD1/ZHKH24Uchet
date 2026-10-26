WITH latest AS (
  SELECT id FROM snapshots WHERE NOT is_test ORDER BY taken_on DESC LIMIT 1
),
seen AS (
  SELECT cs.bin,
         max(s.taken_on) AS last_seen,
         bool_or(cs.snapshot_id = (SELECT id FROM latest)) AS active
    FROM company_states cs
    JOIN snapshots s ON s.id = cs.snapshot_id
   WHERE NOT s.is_test
   GROUP BY cs.bin
)
UPDATE companies c
   SET last_seen = seen.last_seen,
       status = CASE WHEN seen.active THEN 'active' ELSE 'gone' END
  FROM seen
 WHERE seen.bin = c.bin
   AND (c.last_seen IS DISTINCT FROM seen.last_seen
        OR c.status IS DISTINCT FROM CASE WHEN seen.active THEN 'active' ELSE 'gone' END);

ANALYZE companies;

TRUNCATE snapshot_stats;

INSERT INTO snapshot_stats (snapshot_id, previous_id, total)
SELECT s.id,
       lag(s.id) OVER (ORDER BY s.taken_on),
       (SELECT count(*) FROM company_states cs WHERE cs.snapshot_id = s.id)
  FROM snapshots s
 WHERE NOT s.is_test;

UPDATE snapshot_stats st
   SET appeared = (
         SELECT count(*)
           FROM company_states e
          WHERE e.snapshot_id = st.snapshot_id
            AND NOT EXISTS (
              SELECT 1 FROM company_states b
               WHERE b.snapshot_id = st.previous_id AND b.bin = e.bin)),
       disappeared = (
         SELECT count(*)
           FROM company_states b
          WHERE b.snapshot_id = st.previous_id
            AND NOT EXISTS (
              SELECT 1 FROM company_states e
               WHERE e.snapshot_id = st.snapshot_id AND e.bin = b.bin))
 WHERE st.previous_id IS NOT NULL;

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
        SELECT st2.snapshot_id,
               split_part(nb.name_key, '|', 1) IS DISTINCT FROM split_part(ne.name_key, '|', 1) AS name,
               b.director_id IS DISTINCT FROM e.director_id AS director,
               b.address_id IS DISTINCT FROM e.address_id AS address,
               b.oked_code IS DISTINCT FROM e.oked_code AS oked,
               b.secondary_oked IS DISTINCT FROM e.secondary_oked AS secondary_oked,
               b.krp_code IS DISTINCT FROM e.krp_code AS krp,
               b.kse_code IS DISTINCT FROM e.kse_code AS kse,
               b.kfs_code IS DISTINCT FROM e.kfs_code AS kfs
          FROM snapshot_stats st2
          JOIN company_states e ON e.snapshot_id = st2.snapshot_id
          JOIN company_states b ON b.snapshot_id = st2.previous_id AND b.bin = e.bin
          LEFT JOIN company_names nb ON nb.id = b.name_id
          LEFT JOIN company_names ne ON ne.id = e.name_id
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
        SELECT st2.snapshot_id,
               coalesce(c.legal_form, 'other') AS form,
               count(*) AS total,
               count(*) FILTER (WHERE st2.previous_id IS NOT NULL AND NOT EXISTS (
                 SELECT 1 FROM company_states b
                  WHERE b.snapshot_id = st2.previous_id AND b.bin = cs.bin)) AS appeared
          FROM snapshot_stats st2
          JOIN company_states cs ON cs.snapshot_id = st2.snapshot_id
          LEFT JOIN companies c ON c.bin = cs.bin
         GROUP BY st2.snapshot_id, coalesce(c.legal_form, 'other')
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
        SELECT st2.snapshot_id,
               coalesce(left(t.kato, 2), '00') AS region,
               count(*) AS total,
               count(*) FILTER (WHERE st2.previous_id IS NOT NULL AND NOT EXISTS (
                 SELECT 1 FROM company_states b
                  WHERE b.snapshot_id = st2.previous_id AND b.bin = cs.bin)) AS appeared
          FROM snapshot_stats st2
          JOIN company_states cs ON cs.snapshot_id = st2.snapshot_id
          LEFT JOIN addresses a ON a.id = cs.address_id
          LEFT JOIN territories t ON t.id = a.territory_id
         GROUP BY st2.snapshot_id, coalesce(left(t.kato, 2), '00')
      ) g
     GROUP BY snapshot_id
  ) x
 WHERE st.snapshot_id = x.snapshot_id;

SELECT s.taken_on, st.total, st.appeared, st.disappeared, st.changed
  FROM snapshot_stats st
  JOIN snapshots s ON s.id = st.snapshot_id
 ORDER BY s.taken_on;