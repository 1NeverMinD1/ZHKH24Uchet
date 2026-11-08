import ExcelJS from "exceljs";
import pg from "pg";

const [output = "all.xlsx", form = ""] = process.argv.slice(2);

if (!process.env.DATABASE_PASSWORD) {
  console.error("Не задан DATABASE_PASSWORD (пароль пользователя strapi).");
  process.exit(1);
}
if (!form) {
  console.error(
    'Использование: node export-all.mjs "файл.xlsx" форма (например, osi)',
  );
  process.exit(1);
}

const client = new pg.Client({
  host: "127.0.0.1",
  database: "zhkh24_uchet",
  user: "strapi",
  password: process.env.DATABASE_PASSWORD,
});
await client.connect();

const { rows } = await client.query(
  `WITH latest AS (
     SELECT max(taken_on) AS taken_on FROM snapshots WHERE NOT is_test
   ),
   span AS (
     SELECT bin, min(from_on) AS first_seen, max(to_on) AS last_seen,
            count(*) AS periods
       FROM company_periods
      GROUP BY bin
   ),
   last_period AS (
     SELECT DISTINCT ON (bin) *
       FROM company_periods
      ORDER BY bin, to_on DESC
   )
   SELECT lp.bin, n.name_ru, c.registration_date::text AS registration_date,
          s.first_seen::text AS first_seen, s.last_seen::text AS last_seen,
          s.last_seen = l.taken_on AS active,
          EXISTS (
            SELECT 1 FROM snapshots g
             WHERE NOT g.is_test
               AND g.taken_on > s.first_seen AND g.taken_on < s.last_seen
               AND NOT EXISTS (
                 SELECT 1 FROM company_periods x
                  WHERE x.bin = lp.bin AND g.taken_on BETWEEN x.from_on AND x.to_on)
          ) AS had_gap,
                    dr.name AS director, COALESCE(t.path_ru, c.locality_ru) AS place, a.address, lp.unit
     FROM last_period lp
     JOIN span s ON s.bin = lp.bin
     CROSS JOIN latest l
     JOIN company_names n ON n.id = lp.name_id
     LEFT JOIN companies c ON c.bin = lp.bin
     LEFT JOIN directors dr ON dr.id = lp.director_id
     LEFT JOIN addresses a ON a.id = lp.address_id
     LEFT JOIN territories t ON t.id = a.territory_id
    WHERE split_part(n.name_key, '|', 1) = $1
    ORDER BY s.first_seen, n.name_ru`,
  [form],
);
await client.end();

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Компании");

sheet.columns = [
  { header: "БИН", key: "bin", width: 15 },
  { header: "Наименование", key: "name", width: 60 },
  { header: "Дата регистрации", key: "registered", width: 16 },
  { header: "Появилась в реестре", key: "firstSeen", width: 14 },
  { header: "Последний срез в реестре", key: "lastSeen", width: 14 },
  { header: "Статус", key: "status", width: 12 },
  { header: "Пропадала и возвращалась", key: "gap", width: 14 },
  { header: "Руководитель", key: "director", width: 35 },
  { header: "Населённый пункт", key: "place", width: 45 },
  { header: "Адрес", key: "address", width: 55 },
  { header: "Помещение", key: "unit", width: 14 },
];

for (const row of rows) {
  sheet.addRow({
    bin: row.bin,
    name: row.name_ru,
    registered: row.registration_date,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    status: row.active ? "Действует" : "Выбыла",
    gap: row.had_gap ? "Да" : "Нет",
    director: row.director,
    place: row.place,
    address: row.address,
    unit: row.unit,
  });
}

sheet.getRow(1).font = { bold: true };
sheet.views = [{ state: "frozen", ySplit: 1 }];
sheet.autoFilter = {
  from: { row: 1, column: 1 },
  to: { row: 1, column: sheet.columns.length },
};

await workbook.xlsx.writeFile(output);
console.log(`Готово: ${rows.length} записей, файл ${output}`);
process.exit(0);
