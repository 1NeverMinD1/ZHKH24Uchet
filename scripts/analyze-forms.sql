SELECT form, count(*)
  FROM (
    SELECT trim(regexp_replace(regexp_replace(
             upper(split_part(translate(replace(name_ru, '''''', '"'), '«“', '""'), '"', 1)),
             '[^А-ЯЁA-Z ]', ' ', 'g'), '\s+', ' ', 'g')) AS form
      FROM companies
  ) x
 WHERE form <> ''
 GROUP BY form
 ORDER BY count(*) DESC
 LIMIT 70;

SELECT count(*) FILTER (WHERE name_ru !~ '[«"“]') AS no_quotes, count(*) AS total
  FROM companies;

SELECT name_ru
  FROM companies
 WHERE name_ru !~ '[«"“]'
 ORDER BY random()
 LIMIT 25;