import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import pg from "pg";
import { parseAddress } from "./lib/address.mjs";

const args = process.argv.slice(2);
const REPLACE = args.includes("--replace");
const [filePath, takenOn] = args.filter((arg) => !arg.startsWith("--"));
const BATCH = 5000;
const PROGRESS_EVERY = 20000;
const DEBUG_SHEET = Number(process.env.DEBUG_SHEET || 0);
const DEBUG_FROM = Number(process.env.DEBUG_FROM || 0);

if (!filePath || !/^\d{4}-\d{2}-\d{2}$/.test(takenOn || "")) {
  console.error(
    'Использование: node import-snapshot.mjs "путь\\к\\файлу.xlsx" ГГГГ-ММ-ДД [--replace]',
  );
  process.exit(1);
}
if (!existsSync(filePath)) {
  console.error(`Файл не найден: ${filePath}`);
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

const directorKey = (name) =>
  name
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .replace(/[.,"“”«»']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const nameKey = (ru, kk) =>
  ru || kk ? `${directorKey(ru)}|${directorKey(kk)}` : "";

const COLUMNS = [
  "bin",
  "name_key",
  "name_ru",
  "name_kk",
  "director_key",
  "director_name",
  "addr_key",
  "street_type",
  "street",
  "house",
  "addr_text",
  "unit",
  "kato",
];

const places = new Map();

const toRow = (cells) => {
  const bin = clean(cells[1]);
  if (!/^\d{12}$/.test(bin)) return null;

  const kato = clean(cells[18]);
  const pathKk = clean(cells[19]);
  const pathRu = clean(cells[20]);
  if (/^\d{9}$/.test(kato) && pathRu && !places.has(kato)) {
    places.set(kato, { ru: pathRu, kk: pathKk || pathRu });
  }

  const director = clean(cells[22]);
  const address = parseAddress(clean(cells[21]), kato);

  const nameKk = clean(cells[2]);
  const nameRu = clean(cells[3]);

  return [
    bin,
    nameKey(nameRu, nameKk),
    nameRu,
    nameKk,
    directorKey(director),
    director,
    address.key,
    address.type,
    address.street,
    address.house,
    address.text,
    address.unit,
    kato,
  ];
};

const buildTerritories = () => {
  const regions = new Map();
  const districts = new Map();
  const localities = new Map();

  for (const [kato, path] of places) {
    const ru = path.ru.split(", ");
    const kk = path.kk.split(", ");
    const kkAt = (index) => kk[index] || ru[index];

    const regionCode = `${kato.slice(0, 2)}0000000`;
    const districtCode = `${kato.slice(0, 4)}00000`;

    if (!regions.has(regionCode)) {
      regions.set(regionCode, {
        kato: regionCode,
        parent: null,
        ru: ru[0],
        kk: kkAt(0),
        pathRu: ru[0],
        pathKk: kkAt(0),
      });
    }

    if (ru.length >= 2 && !districts.has(districtCode)) {
      districts.set(districtCode, {
        kato: districtCode,
        parent: regionCode,
        ru: ru[1],
        kk: kkAt(1),
        pathRu: ru.slice(0, 2).join(", "),
        pathKk: [kkAt(0), kkAt(1)].join(", "),
      });
    }

    localities.set(kato, {
      kato,
      parent: ru.length >= 2 ? districtCode : regionCode,
      ru: ru[ru.length - 1],
      kk: kkAt(ru.length - 1),
      pathRu: path.ru,
      pathKk: path.kk,
    });
  }

  return { regions, districts, localities };
};

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

const upsertLevel = async (level, parentLevel, items) => {
  const list = [...items.values()];
  if (list.length === 0) return 0;
  await client.query(
    `INSERT INTO territories (level, kato, parent_id, name_ru, name_kk, path_ru, path_kk)
     SELECT $1::smallint, d.kato, p.id, d.name_ru, d.name_kk, d.path_ru, d.path_kk
       FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[])
            AS d(kato, parent_kato, name_ru, name_kk, path_ru, path_kk)
       LEFT JOIN territories p ON p.level = $8::smallint AND p.kato = d.parent_kato
     ON CONFLICT (level, kato) DO UPDATE
        SET parent_id = EXCLUDED.parent_id,
            name_ru = EXCLUDED.name_ru,
            name_kk = EXCLUDED.name_kk,
            path_ru = EXCLUDED.path_ru,
            path_kk = EXCLUDED.path_kk`,
    [
      level,
      list.map((i) => i.kato),
      list.map((i) => i.parent),
      list.map((i) => i.ru),
      list.map((i) => i.kk),
      list.map((i) => i.pathRu),
      list.map((i) => i.pathKk),
      parentLevel,
    ],
  );
  return list.length;
};

log(`Файл: ${filePath}, дата среза: ${takenOn}`);
log("Подключение к базе...");
await client.connect();
log("Подключено. Проверка схемы...");

await client.query(
  readFileSync(
    fileURLToPath(new URL("./history-schema.sql", import.meta.url)),
    "utf8",
  ),
);
log("Схема готова.");

const found = await client.query(
  "SELECT id FROM snapshots WHERE taken_on = $1",
  [takenOn],
);
const replaceId = found.rows[0]?.id;
if (replaceId && !REPLACE) {
  console.error(
    `Срез на ${takenOn} уже загружен. Для перезаписи нужен флаг --replace.`,
  );
  process.exit(1);
}

await client.query("DROP TABLE IF EXISTS hx_import");
await client.query(
  `CREATE UNLOGGED TABLE hx_import (${COLUMNS.map((c) => `${c} text`).join(", ")})`,
);
log("Временная таблица создана. Чтение файла...");

const insertSql =
  `INSERT INTO hx_import (${COLUMNS.join(", ")}) ` +
  `SELECT * FROM unnest(${COLUMNS.map((_, i) => `$${i + 1}::text[]`).join(", ")})`;

let batch = [];
let valid = 0;
let skipped = 0;

const flush = async () => {
  if (batch.length === 0) return;
  await client.query(
    insertSql,
    COLUMNS.map((_, i) => batch.map((row) => row[i])),
  );
  batch = [];
};

const reader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
  worksheets: "emit",
  sharedStrings: "cache",
  styles: "ignore",
  hyperlinks: "ignore",
});

let sheetNumber = 0;

for await (const sheet of reader) {
  sheetNumber += 1;
  let sheetRows = 0;
  log(`Лист ${sheetNumber}: начало.`);

  for await (const row of sheet) {
    sheetRows += 1;
    if (sheetRows % PROGRESS_EVERY === 0) {
      log(`Лист ${sheetNumber}: ${sheetRows} строк, всего компаний ${valid}.`);
    }

    if (sheetNumber === DEBUG_SHEET && sheetRows >= DEBUG_FROM) {
      const rawAddress = clean(row.values[21]);
      console.log(
        `[отладка] лист ${sheetNumber}, строка ${sheetRows}, БИН ${clean(row.values[1])}, длина адреса ${rawAddress.length}: ${rawAddress.slice(0, 150)}`,
      );
    }

    const record = toRow(row.values);
    if (!record) {
      skipped += 1;
      continue;
    }
    batch.push(record);
    valid += 1;
    if (batch.length >= BATCH) await flush();
  }

  log(`Лист ${sheetNumber}: готов, ${sheetRows} строк.`);
}
await flush();
log(`Файл прочитан: ${valid} компаний. Построение среза...`);

try {
  await client.query("BEGIN");

  if (replaceId) {
    log(`Удаление существующего среза на ${takenOn}...`);
    await client.query("DELETE FROM snapshots WHERE id = $1", [replaceId]);
    log("Существующий срез удалён.");
  }

  const snapshot = await client.query(
    "INSERT INTO snapshots (taken_on, source) VALUES ($1, $2) RETURNING id",
    [takenOn, basename(filePath)],
  );
  const snapshotId = snapshot.rows[0].id;

  const { regions, districts, localities } = buildTerritories();
  await upsertLevel(1, 0, regions);
  await upsertLevel(2, 1, districts);
  await upsertLevel(3, 2, localities);
  log("Территории обновлены. Добавление руководителей...");

  const newDirectors = await client.query(
    `INSERT INTO directors (name_key, name)
     SELECT DISTINCT ON (director_key) director_key, director_name
       FROM hx_import WHERE director_key <> ''
      ORDER BY director_key, director_name
     ON CONFLICT (name_key) DO NOTHING`,
  );
  log(
    `Руководители добавлены: ${newDirectors.rowCount}. Добавление адресов...`,
  );

  const newAddresses = await client.query(
    `INSERT INTO addresses (addr_key, territory_id, street_type, street, house, address)
     SELECT DISTINCT ON (i.addr_key) i.addr_key, t.id,
            NULLIF(i.street_type, ''), NULLIF(i.street, ''), NULLIF(i.house, ''), i.addr_text
       FROM hx_import i
       LEFT JOIN territories t ON t.level = 3 AND t.kato = i.kato
      WHERE i.addr_key <> ''
      ORDER BY i.addr_key, i.addr_text
     ON CONFLICT (addr_key) DO NOTHING`,
  );
  log(`Адреса добавлены: ${newAddresses.rowCount}. Добавление названий...`);

  const newNames = await client.query(
    `INSERT INTO company_names (bin, name_key, name_ru, name_kk)
     SELECT DISTINCT ON (bin, name_key) bin, name_key,
            NULLIF(name_ru, ''), NULLIF(name_kk, '')
       FROM hx_import WHERE name_key <> ''
      ORDER BY bin, name_key, name_ru
     ON CONFLICT (bin, name_key) DO NOTHING`,
  );
  log(`Названия добавлены: ${newNames.rowCount}. Запись состояний компаний...`);

  await client.query(
    `INSERT INTO company_states (snapshot_id, bin, name_id, director_id, address_id, unit)
     SELECT $1, i.bin, n.id, d.id, a.id, NULLIF(i.unit, '')
       FROM (SELECT DISTINCT ON (bin) * FROM hx_import ORDER BY bin) i
       LEFT JOIN company_names n ON n.bin = i.bin AND n.name_key = i.name_key
       LEFT JOIN directors d ON d.name_key = i.director_key
       LEFT JOIN addresses a ON a.addr_key = i.addr_key`,
    [snapshotId],
  );

  await client.query(
    "UPDATE snapshots SET rows_total = (SELECT count(*) FROM company_states WHERE snapshot_id = $1) WHERE id = $1",
    [snapshotId],
  );

  await client.query("COMMIT");
  log("Срез сохранён. Обновление статистики...");

  await client.query("DROP TABLE hx_import");
  for (const table of [
    "territories",
    "company_names",
    "directors",
    "addresses",
    "company_states",
  ]) {
    await client.query(`ANALYZE ${table}`);
  }

  log(
    `Готово. Территорий: ${regions.size} областей, ${districts.size} районов, ${localities.size} населённых пунктов.`,
  );
  log(
    `Новых руководителей: ${newDirectors.rowCount}, новых адресов: ${newAddresses.rowCount}. Строк пропущено (нет БИН): ${skipped}.`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Ошибка, срез не сохранён:", error.message);
  process.exit(1);
}

await client.end();
process.exit(0);
