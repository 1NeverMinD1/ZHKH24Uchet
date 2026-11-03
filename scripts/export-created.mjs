import ExcelJS from "exceljs";
import pg from "pg";

const [output = "created.xlsx", form = "", from = "", to = ""] =
  process.argv.slice(2);

if (!process.env.DATABASE_PASSWORD) {
  console.error("Не задан DATABASE_PASSWORD (пароль пользователя strapi).");
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
  console.error(
    'Использование: node export-created.mjs "файл.xlsx" форма ГГГГ-ММ-ДД ГГГГ-ММ-ДД',
  );
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

const { rows } = await client.query(
  `SELECT bin, name_ru, legal_form, registration_date::text AS registration_date,
          oked_code, oked_name_ru, krp_name_ru, director_name,
          locality_ru, legal_address, status, last_seen::text AS last_seen
     FROM companies
    WHERE registration_date BETWEEN $2::date AND $3::date
      AND ($1 = '' OR legal_form = $1)
    ORDER BY registration_date, name_ru`,
  [form, from, to],
);
await client.end();

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Созданные");

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
  { header: "Адрес", key: "address", width: 55 },
  { header: "Статус", key: "status", width: 12 },
  { header: "Последний срез в реестре", key: "lastSeen", width: 14 },
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
    director: row.director_name,
    place: row.locality_ru,
    address: row.legal_address,
    status: row.status === "gone" ? "Выбыла" : "Действует",
    lastSeen: row.last_seen,
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
