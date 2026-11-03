import ExcelJS from "exceljs";
import pg from "pg";

const [output = "gone.xlsx", form = "", fromArg = "", toArg = ""] =
  process.argv.slice(2);

if (!process.env.DATABASE_PASSWORD) {
  console.error("Не задан DATABASE_PASSWORD (пароль пользователя strapi).");
  process.exit(1);
}

const FORMS = {
  too: "ТОО",
  ao: "АО",
  osi: "ОСИ",
  ksk: "КСК",
  coop: "Кооператив",
  partnership: "Товарищество",
  branch: "Филиал / представительство",
  aifc: "МФЦА",
  gov_enterprise: "Гос. предприятие",
  gov_institution: "Гос. учреждение",
  association: "Объединение",
  fund: "Фонд",
  institution: "Учреждение",
  other: "Другое",
};

const client = new pg.Client({
  host: "127.0.0.1",
  database: "zhkh24_uchet",
  user: "strapi",
  password: process.env.DATABASE_PASSWORD,
});
await client.connect();

const latest = (
  await client.query(
    "SELECT max(taken_on)::text AS taken_on FROM snapshots WHERE NOT is_test",
  )
).rows[0].taken_on;

const from = fromArg || latest;
const to = toArg || latest;

const { rows } = await client.query(
  `WITH o AS (
     SELECT taken_on, lead(taken_on) OVER (ORDER BY taken_on) AS next_on
       FROM snapshots WHERE NOT is_test
   )
   SELECT p.bin, n.name_ru, c.legal_form, c.registration_date::text AS registration_date,
          p.oked_code, c.oked_name_ru, c.krp_name_ru, dr.name AS director,
          t.path_ru AS place, a.address, p.unit,
          p.to_on::text AS last_seen, o.next_on::text AS gone_on,
          EXISTS (
            SELECT 1 FROM company_periods r
             WHERE r.bin = p.bin AND r.from_on > p.to_on) AS returned
     FROM company_periods p
     JOIN o ON o.taken_on = p.to_on AND o.next_on IS NOT NULL
     LEFT JOIN company_names n ON n.id = p.name_id
     LEFT JOIN companies c ON c.bin = p.bin
     LEFT JOIN directors dr ON dr.id = p.director_id
     LEFT JOIN addresses a ON a.id = p.address_id
     LEFT JOIN territories t ON t.id = a.territory_id
    WHERE o.next_on BETWEEN $2::date AND $3::date
      AND ($1 = '' OR c.legal_form = $1)
      AND NOT EXISTS (
        SELECT 1 FROM company_periods e WHERE e.bin = p.bin AND e.from_on = o.next_on)
    ORDER BY o.next_on, n.name_ru`,
  [form, from, to],
);
await client.end();

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Выбывшие");

sheet.columns = [
  { header: "БИН", key: "bin", width: 15 },
  { header: "Наименование", key: "name", width: 60 },
  { header: "Форма", key: "form", width: 18 },
  { header: "Дата регистрации", key: "registered", width: 16 },
  { header: "ОКЭД", key: "oked", width: 9 },
  { header: "Вид деятельности", key: "okedName", width: 45 },
  { header: "Размер (КРП)", key: "krp", width: 28 },
  { header: "Руководитель", key: "director", width: 35 },
  { header: "Населённый пункт", key: "place", width: 45 },
  { header: "Адрес", key: "address", width: 45 },
  { header: "Помещение", key: "unit", width: 14 },
  { header: "Последний срез в реестре", key: "lastSeen", width: 14 },
  { header: "Нет в срезе на", key: "goneOn", width: 14 },
  { header: "Вернулась позже", key: "returned", width: 12 },
];

for (const row of rows) {
  sheet.addRow({
    bin: row.bin,
    name: row.name_ru,
    form: FORMS[row.legal_form] || row.legal_form || "",
    registered: row.registration_date,
    oked: row.oked_code,
    okedName: row.oked_name_ru,
    krp: row.krp_name_ru,
    director: row.director,
    place: row.place,
    address: row.address,
    unit: row.unit,
    lastSeen: row.last_seen,
    goneOn: row.gone_on,
    returned: row.returned ? "Да" : "Нет",
  });
}

sheet.getRow(1).font = { bold: true };
sheet.views = [{ state: "frozen", ySplit: 1 }];
sheet.autoFilter = {
  from: { row: 1, column: 1 },
  to: { row: 1, column: sheet.columns.length },
};

await workbook.xlsx.writeFile(output);
console.log(
  `Готово: ${rows.length} записей за ${from} — ${to}, файл ${output}`,
);
process.exit(0);
