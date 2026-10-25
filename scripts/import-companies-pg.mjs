import { createHmac } from "node:crypto";
import ExcelJS from "exceljs";
import pg from "pg";

const [, , filePath, limitArg] = process.argv;
const LIMIT = Number(limitArg) > 0 ? Number(limitArg) : Infinity;
const BATCH = 5000;
const TEMPLATE_BIN = "000000000000";

const DATA_COLUMNS = [
  "bin",
  "name_kk",
  "name_ru",
  "registration_date",
  "oked_code",
  "oked_name_kk",
  "oked_name_ru",
  "secondary_oked",
  "krp_code",
  "krp_name_kk",
  "krp_name_ru",
  "kse_code",
  "kse_name_kk",
  "kse_name_ru",
  "kfs_code",
  "kfs_name_kk",
  "kfs_name_ru",
  "kato",
  "locality_kk",
  "locality_ru",
  "legal_address",
  "director_name",
  "slug",
  "slug_code",
  "legal_form",
  "sort_name",
];

const UPDATE_COLUMNS = DATA_COLUMNS.filter((c) => c !== "bin");

const SYSTEM_COLUMNS = ["id", "document_id", "created_at", "updated_at"];

if (!filePath) {
  console.error(
    'Использование: node import-companies-pg.mjs "путь\\к\\файлу.xlsx" [лимит]',
  );
  process.exit(1);
}
if (!process.env.SLUG_SECRET) {
  console.error("Не задан SLUG_SECRET (ключ для кодов в адресах компаний).");
  process.exit(1);
}
if (!process.env.DATABASE_PASSWORD) {
  console.error("Не задан DATABASE_PASSWORD (пароль пользователя strapi).");
  process.exit(1);
}

const clean = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value instanceof Date) return "";
    if (value.richText)
      return clean(value.richText.map((t) => t.text).join(""));
    if (value.result !== undefined) return clean(value.result);
    if (value.text !== undefined) return clean(value.text);
  }
  return String(value).replace(/\s+/g, " ").trim();
};

const toIsoDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial <= 0) return "";
  return new Date(Math.round((serial - 25569) * 86400 * 1000))
    .toISOString()
    .slice(0, 10);
};

const TRANSLIT = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  ә: "a",
  ғ: "g",
  қ: "k",
  ң: "n",
  ө: "o",
  ұ: "u",
  ү: "u",
  һ: "h",
  і: "i",
};

const slugCode = (bin) => {
  const hex = createHmac("sha256", process.env.SLUG_SECRET)
    .update(bin)
    .digest("hex");
  return Number.parseInt(hex.slice(0, 13), 16)
    .toString(36)
    .padStart(10, "0")
    .slice(-10);
};

const slugName = (name) => {
  const prepared = name.replace(/''/g, '"');
  const quoted = prepared.match(/[«"“]([^»"”]+)[»"”]/);
  const latin = [...(quoted ? quoted[1] : prepared).toLowerCase()]
    .map((char) => TRANSLIT[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (latin.length <= 60) return latin || "company";
  return latin.slice(0, 60).replace(/-[^-]*$/, "") || latin.slice(0, 60);
};

const QUOTES = /[«»"“”„]/;

const LEGAL_FORMS = [
  ["branch", /^(ФИЛИАЛ|ПРЕДСТАВИТЕЛЬСТВО)( |$)/],
  ["ksk", /КООПЕРАТИВ\S* СОБСТВЕННИКОВ (КВАРТИР|ПОМЕЩЕНИЙ)|^(ПК )?КСК( |$)/],
  [
    "partnership",
    /ТОВАРИЩЕСТВ\S* С ДОПОЛНИТЕЛЬНОЙ|^(ПОЛНОЕ|КОММАНДИТНОЕ) ТОВАРИЩЕСТВО|СЕЛЬСКОХОЗЯЙСТВЕННОЕ ТОВАРИЩЕСТВО|^(ТДО|КТ)( |$)/,
  ],
  ["too", /ТОВАРИЩЕСТВ.*(ОГ?Р\S*НИЧ|ОТВЕ\S*СТВЕННОСТ)|^ТОО( |$)/],
  [
    "aifc",
    /^(ЧАСТНАЯ|ПУБЛИЧНАЯ) КОМПАНИЯ|^КОМПАНИЯ СПЕЦИАЛЬНОГО НАЗНАЧЕНИЯ|^ЧК( |$)|^ПАРТНЕРСТВО С ОГРАНИЧЕННОЙ|^ОГРАНИЧЕННОЕ ПАРТНЕРСТВО|^НЕКОММЕРЧЕСКАЯ ОРГАНИЗАЦИЯ/,
  ],
  [
    "ao",
    /^((НЕКОММЕРЧЕСКОЕ|ЗАКРЫТОЕ|ОТКРЫТОЕ) )?АКЦИОНЕРНОЕ ОБЩЕСТВО|^(АО|НАО|ЗАО|ОАО)( |$)/,
  ],
  ["osi", /^ОБ[ЪЬ]?ЕД[ИЕ]Н\S* СОБСТВЕННИКОВ ИМУЩЕСТВА|^ОСИ( |$)/],
  ["coop", /КООПЕРАТИВ|^(ПК|СПК|СХПК|ЖСК|ПГК)( |$)/],
  ["gov_enterprise", /ГОСУДА\S*.*ПРЕДП|^(ГКП|КГКП|КГП|РГП|РГКП)( |$)/],
  ["gov_institution", /ГОСУДА\S*.*УЧЕ?РЕЖД|^(ГУ|КГУ|РГУ)( |$)/],
  [
    "association",
    /ОБ[ЪЬ]?ЕД[ИЕ]Н|АССОЦИАЦИ|СОЮЗ( |$)|ПАЛАТА( |$)|КОЛЛЕГИЯ( |$)|^(ОО|ООИ|ОЮЛ|РОО)( |$)/,
  ],
  ["fund", /ФОНД( |$)|^(ОФ|ЧФ|КФ)( |$)/],
  ["institution", /УЧЕ?РЕЖД|^ЧУ( |$)/],
];
const FORM_PREFIX =
  /^(ТОВАРИЩЕСТВ[ОА] С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ|ТОО|(ЧАСТНАЯ|ПУБЛИЧНАЯ) КОМПАНИЯ( (ОТКРЫТОГО|ЗАКРЫТОГО) ИНВЕСТИЦИОННОГО ТИПА)?|КОМПАНИЯ СПЕЦИАЛЬНОГО НАЗНАЧЕНИЯ|ЧК)\s+/i;

const splitName = (name) => {
  const text = name.replace(/''/g, '"');
  const first = text.search(QUOTES);
  if (first === -1) return { form: text, inner: "" };

  let last = first;
  for (let i = text.length - 1; i > first; i -= 1) {
    if (QUOTES.test(text[i])) {
      last = i;
      break;
    }
  }

  const head = text.slice(0, first);
  const tail = last > first ? text.slice(last + 1) : "";
  const inner =
    last > first ? text.slice(first + 1, last) : text.slice(first + 1);

  return {
    form: head.trim() ? head : tail.trim() ? tail : inner,
    inner,
  };
};

const legalFormOf = (form) => {
  const head = form
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .replace(/[^А-ЯA-Z0-9]+/g, " ")
    .trim();
  for (const [code, pattern] of LEGAL_FORMS) {
    if (pattern.test(head)) return code;
  }
  return "other";
};

const trimJunk = (value) => value.replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const sortNameOf = (name, inner) =>
  (
    trimJunk(inner || name.replace(FORM_PREFIX, "")) || trimJunk(name)
  ).toUpperCase();

const toRecord = (cells) => {
  const bin = clean(cells[1]);
  if (!/^\d{12}$/.test(bin)) return null;

  const nameRu = clean(cells[3]);
  if (!nameRu) return null;

  const code = slugCode(bin);
  const parts = splitName(nameRu);

  return {
    bin,
    name_kk: clean(cells[2]),
    name_ru: nameRu,
    registration_date: toIsoDate(cells[4]),
    oked_code: clean(cells[5]),
    oked_name_kk: clean(cells[6]),
    oked_name_ru: clean(cells[7]),
    secondary_oked: clean(cells[8]),
    krp_code: clean(cells[9]),
    krp_name_kk: clean(cells[10]),
    krp_name_ru: clean(cells[11]),
    kse_code: clean(cells[12]),
    kse_name_kk: clean(cells[13]),
    kse_name_ru: clean(cells[14]),
    kfs_code: clean(cells[15]),
    kfs_name_kk: clean(cells[16]),
    kfs_name_ru: clean(cells[17]),
    kato: clean(cells[18]),
    locality_kk: clean(cells[19]),
    locality_ru: clean(cells[20]),
    legal_address: clean(cells[21]),
    director_name: clean(cells[22]),
    slug: `${slugName(nameRu)}-${code}`,
    slug_code: code,
    legal_form: legalFormOf(parts.form),
    sort_name: sortNameOf(nameRu, parts.inner),
  };
};

const sourceValue = (column) =>
  column === "registration_date"
    ? `NULLIF(s.${column}, '')::date`
    : `NULLIF(s.${column}, '')`;

const client = new pg.Client({
  host: process.env.DATABASE_HOST || "127.0.0.1",
  port: Number(process.env.DATABASE_PORT) || 5432,
  database: process.env.DATABASE_NAME || "zhkh24_uchet",
  user: process.env.DATABASE_USERNAME || "strapi",
  password: process.env.DATABASE_PASSWORD,
});

const started = Date.now();
const seconds = () => Math.round((Date.now() - started) / 1000);
const log = (message) => console.log(`[${seconds()} с] ${message}`);

log(`Файл: ${filePath}`);
log("Подключение к базе...");
await client.connect();

const { rows: columnRows } = await client.query(
  `SELECT column_name, character_maximum_length
     FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'companies'`,
);

if (columnRows.length === 0) {
  console.error(
    "Таблица companies не найдена. Сначала нужно запустить Strapi, он создаст таблицы.",
  );
  process.exit(1);
}

const existing = new Map(
  columnRows.map((r) => [r.column_name, r.character_maximum_length]),
);
const missing = DATA_COLUMNS.filter((c) => !existing.has(c));
if (missing.length > 0) {
  console.error(
    `В таблице нет колонок: ${missing.join(", ")}. Схема не совпадает с ожидаемой.`,
  );
  process.exit(1);
}

const metaColumns = [...existing.keys()].filter(
  (c) => !DATA_COLUMNS.includes(c) && !SYSTEM_COLUMNS.includes(c),
);

if (metaColumns.length > 0) {
  const { rows } = await client.query("SELECT 1 FROM companies LIMIT 1");
  if (rows.length === 0) {
    console.error(
      "В таблице нет ни одной записи-шаблона. Нужно создать в админке Strapi компанию с БИН 000000000000 и сохранить её.",
    );
    process.exit(1);
  }
}

const before = Number(
  (await client.query("SELECT count(*) FROM companies")).rows[0].count,
);
log(`Подключено. Компаний в базе: ${before}. Чтение файла...`);

await client.query("DROP TABLE IF EXISTS company_import");
await client.query(
  `CREATE UNLOGGED TABLE company_import (${DATA_COLUMNS.map((c) => `${c} text`).join(", ")})`,
);

const unnestSql =
  `INSERT INTO company_import (${DATA_COLUMNS.join(", ")}) ` +
  `SELECT * FROM unnest(${DATA_COLUMNS.map((_, i) => `$${i + 1}::text[]`).join(", ")})`;

const stats = { rows: 0, valid: 0, skipped: 0, truncated: 0 };
let batch = [];

const flush = async () => {
  if (batch.length === 0) return;
  const arrays = DATA_COLUMNS.map((column) =>
    batch.map((record) => record[column]),
  );
  await client.query(unnestSql, arrays);
  batch = [];
};

const reader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
  worksheets: "emit",
  sharedStrings: "cache",
  styles: "cache",
  hyperlinks: "ignore",
});

let sheetNumber = 0;

outer: for await (const sheet of reader) {
  sheetNumber += 1;
  log(`Лист ${sheetNumber}: начало.`);

  for await (const row of sheet) {
    stats.rows += 1;
    const record = toRecord(row.values);

    if (!record) {
      stats.skipped += 1;
      continue;
    }

    for (const column of DATA_COLUMNS) {
      const max = existing.get(column);
      if (max && record[column].length > max) {
        record[column] = record[column].slice(0, max);
        stats.truncated += 1;
      }
    }

    batch.push(record);
    stats.valid += 1;

    if (batch.length >= BATCH) {
      await flush();
      if (stats.valid % 50000 === 0) {
        log(`Прочитано ${stats.valid} компаний.`);
      }
    }

    if (stats.valid >= LIMIT) break outer;
  }
}

await flush();
log(`Файл прочитан: ${stats.valid} компаний. Обновление companies...`);

const sourceSql =
  "(SELECT DISTINCT ON (bin) * FROM company_import ORDER BY bin) s";

await client.query("BEGIN");

const updated = await client.query(
  `UPDATE companies c
      SET ${UPDATE_COLUMNS.map((col) => `${col} = ${sourceValue(col)}`).join(",\n          ")},
          updated_at = now()
     FROM ${sourceSql}
    WHERE c.bin = s.bin
      AND (${UPDATE_COLUMNS.map((col) => `c.${col} IS DISTINCT FROM ${sourceValue(col)}`).join("\n           OR ")})`,
);
log(
  `Обновлено изменившихся компаний: ${updated.rowCount}. Добавление новых...`,
);

const insertColumns = [
  "document_id",
  ...DATA_COLUMNS,
  "created_at",
  "updated_at",
  ...metaColumns,
];

const selectColumns = [
  `'z' || substr(md5('company-' || s.bin), 1, 23)`,
  ...DATA_COLUMNS.map((c) => sourceValue(c)),
  "now()",
  "now()",
  ...metaColumns.map((c) => `t.${c}`),
];

const templateJoin =
  metaColumns.length > 0
    ? `CROSS JOIN (SELECT ${metaColumns.join(", ")} FROM companies ORDER BY id LIMIT 1) t`
    : "";

const inserted = await client.query(
  `INSERT INTO companies (${insertColumns.join(", ")})
   SELECT ${selectColumns.join(", ")}
     FROM ${sourceSql}
     ${templateJoin}
    WHERE NOT EXISTS (SELECT 1 FROM companies c WHERE c.bin = s.bin)`,
);

await client.query("DELETE FROM companies WHERE bin = $1", [TEMPLATE_BIN]);
await client.query("COMMIT");

await client.query("DROP TABLE company_import");
await client.query("ANALYZE companies");

const after = Number(
  (await client.query("SELECT count(*) FROM companies")).rows[0].count,
);

log(
  `Готово. Добавлено: ${inserted.rowCount}, обновлено: ${updated.rowCount}, было в базе: ${before}, стало: ${after}.`,
);
log(
  `Строк в файле: ${stats.rows}, пропущено (нет БИН или названия): ${stats.skipped}, обрезано длинных значений: ${stats.truncated}.`,
);

await client.end();
process.exit(0);
