WITH o AS (
  SELECT taken_on, lag(taken_on) OVER (ORDER BY taken_on) AS prev
    FROM snapshots WHERE NOT is_test
)
SELECT o.taken_on,
       (SELECT count(*) FROM company_periods c WHERE o.taken_on BETWEEN c.from_on AND c.to_on) AS companies,
       count(b.bin) FILTER (WHERE b.name_id IS DISTINCT FROM e.name_id) AS name,
       count(b.bin) FILTER (WHERE b.director_id IS DISTINCT FROM e.director_id) AS director,
       count(b.bin) FILTER (WHERE b.address_id IS DISTINCT FROM e.address_id) AS address,
       count(b.bin) FILTER (WHERE b.address_id = e.address_id AND b.unit_id IS DISTINCT FROM e.unit_id) AS unit
  FROM o
  LEFT JOIN company_periods e ON e.from_on = o.taken_on
  LEFT JOIN company_periods b ON b.bin = e.bin AND b.to_on = o.prev
 GROUP BY o.taken_on
 ORDER BY o.taken_on;

SELECT 'names' AS what, count(*) FROM company_names
 WHERE strpos(name_ru, chr(65533)) > 0 OR name_ru ~ '[[:alpha:]]\?|\?[[:alpha:]]'
UNION ALL
SELECT 'directors', count(*) FROM directors
 WHERE strpos(name, chr(65533)) > 0 OR name ~ '[[:alpha:]]\?|\?[[:alpha:]]'
UNION ALL
SELECT 'addresses', count(*) FROM addresses
 WHERE strpos(address, chr(65533)) > 0 OR address ~ '[[:alpha:]]\?|\?[[:alpha:]]';