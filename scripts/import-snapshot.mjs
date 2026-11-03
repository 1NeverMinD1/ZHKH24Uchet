import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import pg from "pg";
import { parseAddress, parseUnit } from "./lib/address.mjs";
import { cellAt, detectColumns } from "./lib/columns.mjs";
import {
  buildingKeyOf,
  directorKeyOf,
  isBroken,
  nameKeyOf,
  unitKeyOf,
} from "./lib/keys.mjs";

const args = process.argv.slice(2);
const REPLACE = args.includes("--replace");
const [filePath, takenOn] = args.filter((arg) => !arg.startsWith("--"));
const BATCH = 5000;
const PROGRESS_EVERY = 20000;

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

const flag = (value) => (value ? "1" : "");

const COLUMNS = [
  "bin",
  "name_key",
  "name_ru",
  "name_kk",
  "name_bad",
  "kk_bad",
  "director_key",
  "director_name",
  "dir_bad",
  "addr_key",
  "street_type",
  "street",
  "house",
  "addr_text",
  "addr_bad",
  "unit",
  "unit_key",
  "unit_kind",
  "unit_number",
  "unit_floor",
  "kato",
  "oked_code",
  "secondary_oked",
  "krp_code",
  "kse_code",
  "kfs_code",
];

const okedList = (value) =>
  [...new Set(value.match(/\d{5}/g) || [])].sort().join(",");

const places = new Map();

const toRow = (cells, map) => {
  const get = (field) => clean(cellAt(cells, map, field));

  const bin = get("bin");
  if (!/^\d{12}$/.test(bin)) return null;

  const kato = get("kato");
  const pathKk = get("locality_kk");
  const pathRu = get("locality_ru");
  if (
    /^\d{9}$/.test(kato) &&
    pathRu &&
    !isBroken(pathRu) &&
    !places.has(kato)
  ) {
    places.set(kato, {
      ru: pathRu,
      kk: pathKk && !isBroken(pathKk) ? pathKk : pathRu,
    });
  }

  const director = get("director_name");
  const rawAddress = get("legal_address");
  const address = parseAddress(rawAddress, kato);
  const unit = parseUnit(address.unit);

  const nameKk = get("name_kk");
  const nameRu = get("name_ru");

  return [
    bin,
    nameKeyOf(nameRu),
    nameRu,
    nameKk,
    flag(isBroken(nameRu)),
    flag(isBroken(nameKk)),
    directorKeyOf(director),
    director,
    flag(isBroken(director)),
    buildingKeyOf(address, kato),
    address.type,
    address.street,
    address.house,
    address.text,
    flag(isBroken(rawAddress)),
    address.unit,
    unitKeyOf(unit),
    unit.kind,
    unit.number,
    unit.floor,
    kato,
    get("oked_code"),
    okedList(get("secondary_oked")),
    get("krp_code"),
    get("kse_code"),
    get("kfs_code"),
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

const CLEAN = (column) =>
  `(strpos(${column}, chr(65533)) = 0 AND ${column} !~ '[[:alpha:]]\\?|\\?[[:alpha:]]')`;

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

const latestFound = await client.query(
  "SELECT max(taken_on)::text AS latest FROM snapshots WHERE NOT is_test",
);
const latest = latestFound.rows[0].latest;
if (latest && takenOn < latest) {
  console.error(
    `Срез на ${takenOn} раньше последнего загруженного (${latest}). Срезы загружаются строго по порядку дат.`,
  );
  process.exit(1);
}

const previousFound = await client.query(
  `SELECT taken_on::text AS taken_on, has_codes FROM snapshots
    WHERE taken_on < $1 AND NOT is_test
    ORDER BY taken_on DESC LIMIT 1`,
  [takenOn],
);
const previous = previousFound.rows[0] || null;

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
let layout = null;

for await (const sheet of reader) {
  sheetNumber += 1;
  let sheetRows = 0;
  log(`Лист ${sheetNumber}: начало.`);

  for await (const row of sheet) {
    sheetRows += 1;
    if (sheetRows % PROGRESS_EVERY === 0) {
      log(`Лист ${sheetNumber}: ${sheetRows} строк, всего компаний ${valid}.`);
    }

    const values = row.values;

    if (!layout || !/^\d{12}$/.test(clean(cellAt(values, layout.map, "bin")))) {
      const detected = detectColumns(values);
      if (detected) {
        if (detected.missing.length > 0) {
          console.error(
            `В заголовке не найдены колонки: ${detected.missing.join(", ")}.`,
          );
          process.exit(1);
        }
        if (!layout) {
          log(
            `Заголовок найден: полей ${Object.keys(detected.map).length}, КСЭ и КФС ${detected.hasCodes ? "есть" : "нет"}.`,
          );
        }
        layout = detected;
        continue;
      }
    }

    if (!layout) {
      skipped += 1;
      continue;
    }

    const record = toRow(values, layout.map);
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

if (!layout) {
  console.error("В файле не найдена строка заголовков с колонкой «БИН».");
  process.exit(1);
}
const HAS_CODES = layout.hasCodes;
const previousOn = previous ? previous.taken_on : null;

log(`Файл прочитан: ${valid} компаний. Построение среза...`);

try {
  await client.query("BEGIN");

  if (replaceId) {
    log(`Откат периодов среза на ${takenOn}...`);
    await client.query("DELETE FROM company_periods WHERE from_on = $1", [
      takenOn,
    ]);
    if (previous) {
      await client.query(
        "UPDATE company_periods SET to_on = $2 WHERE to_on = $1",
        [takenOn, previous.taken_on],
      );
    }
    log(`Удаление существующего среза на ${takenOn}...`);
    await client.query("DELETE FROM snapshots WHERE id = $1", [replaceId]);
    log("Существующий срез удалён.");
  }

  const snapshot = await client.query(
    "INSERT INTO snapshots (taken_on, source, has_codes) VALUES ($1, $2, $3) RETURNING id",
    [takenOn, basename(filePath), HAS_CODES],
  );
  const snapshotId = snapshot.rows[0].id;

  const { regions, districts, localities } = buildTerritories();
  await upsertLevel(1, 0, regions);
  await upsertLevel(2, 1, districts);
  await upsertLevel(3, 2, localities);
  log("Территории обновлены. Подготовка предыдущих периодов...");

  await client.query("DROP TABLE IF EXISTS hx_prev");
  await client.query(
    `CREATE UNLOGGED TABLE hx_prev AS
     SELECT p.*, a.addr_key AS prev_addr_key
       FROM company_periods p
       LEFT JOIN addresses a ON a.id = p.address_id
      WHERE $1::date IS NOT NULL AND p.to_on = $1::date`,
    [previousOn],
  );
  await client.query("CREATE INDEX ON hx_prev (bin)");
  await client.query("CREATE INDEX ON hx_import (bin)");
  log("Добавление руководителей...");

  const newDirectors = await client.query(
    `INSERT INTO directors (name_key, name)
     SELECT DISTINCT ON (i.director_key) i.director_key, i.director_name
       FROM hx_import i
      WHERE i.director_key <> ''
        AND (i.dir_bad = '' OR NOT EXISTS (SELECT 1 FROM hx_prev p WHERE p.bin = i.bin))
      ORDER BY i.director_key, (i.dir_bad <> ''), i.director_name
     ON CONFLICT (name_key) DO UPDATE SET name = EXCLUDED.name
      WHERE directors.name IS DISTINCT FROM EXCLUDED.name AND ${CLEAN("EXCLUDED.name")}`,
  );
  log(
    `Руководители: добавлено или обновлено ${newDirectors.rowCount}. Смена КАТО у зданий...`,
  );

  const rekeyed = await client.query(
    `UPDATE addresses a
        SET addr_key = r.new_key,
            territory_id = COALESCE(t.id, a.territory_id),
            street_type = NULLIF(r.street_type, ''),
            street = NULLIF(r.street, ''),
            house = NULLIF(r.house, ''),
            address = r.addr_text
       FROM (
         SELECT DISTINCT ON (x.new_key) x.*
           FROM (
             SELECT DISTINCT ON (p.address_id)
                    p.address_id, i.addr_key AS new_key, i.kato,
                    i.street_type, i.street, i.house, i.addr_text
               FROM hx_import i
               JOIN hx_prev p ON p.bin = i.bin
              WHERE i.addr_key <> '' AND i.addr_bad = ''
                AND p.prev_addr_key IS NOT NULL
                AND split_part(p.prev_addr_key, '|', 1) <> i.kato
                AND substr(p.prev_addr_key, strpos(p.prev_addr_key, '|'))
                    = substr(i.addr_key, strpos(i.addr_key, '|'))
              ORDER BY p.address_id, i.addr_key
           ) x
          ORDER BY x.new_key, x.address_id
       ) r
       LEFT JOIN territories t ON t.level = 3 AND t.kato = r.kato
      WHERE a.id = r.address_id
        AND NOT EXISTS (SELECT 1 FROM addresses e WHERE e.addr_key = r.new_key)`,
  );
  log(`Зданий с новым КАТО: ${rekeyed.rowCount}. Добавление адресов...`);

  const newAddresses = await client.query(
    `INSERT INTO addresses (addr_key, territory_id, street_type, street, house, address)
     SELECT DISTINCT ON (i.addr_key) i.addr_key, t.id,
            NULLIF(i.street_type, ''), NULLIF(i.street, ''), NULLIF(i.house, ''), i.addr_text
       FROM hx_import i
       LEFT JOIN territories t ON t.level = 3 AND t.kato = i.kato
      WHERE i.addr_key <> ''
        AND (i.addr_bad = '' OR NOT EXISTS (SELECT 1 FROM hx_prev p WHERE p.bin = i.bin))
      ORDER BY i.addr_key, (i.addr_bad <> ''), i.addr_text
     ON CONFLICT (addr_key) DO UPDATE
        SET address = EXCLUDED.address,
            street_type = EXCLUDED.street_type,
            street = EXCLUDED.street,
            house = EXCLUDED.house
      WHERE addresses.address IS DISTINCT FROM EXCLUDED.address AND ${CLEAN("EXCLUDED.address")}`,
  );
  log(
    `Адреса: добавлено или обновлено ${newAddresses.rowCount}. Добавление помещений...`,
  );

  const newUnits = await client.query(
    `INSERT INTO units (address_id, unit_key, kind, number, floor, label)
     SELECT DISTINCT ON (a.id, i.unit_key) a.id, i.unit_key,
            NULLIF(i.unit_kind, ''), NULLIF(i.unit_number, ''),
            NULLIF(i.unit_floor, ''), i.unit
       FROM hx_import i
       JOIN addresses a ON a.addr_key = i.addr_key
      WHERE i.unit_key <> ''
        AND (i.addr_bad = '' OR NOT EXISTS (SELECT 1 FROM hx_prev p WHERE p.bin = i.bin))
      ORDER BY a.id, i.unit_key, (i.addr_bad <> ''), i.unit
     ON CONFLICT (address_id, unit_key) DO UPDATE
        SET kind = EXCLUDED.kind,
            number = EXCLUDED.number,
            floor = EXCLUDED.floor,
            label = EXCLUDED.label
      WHERE units.label IS DISTINCT FROM EXCLUDED.label AND ${CLEAN("EXCLUDED.label")}`,
  );
  log(
    `Помещения: добавлено или обновлено ${newUnits.rowCount}. Добавление названий...`,
  );

  const newNames = await client.query(
    `INSERT INTO company_names (bin, name_key, name_ru, name_kk)
     SELECT DISTINCT ON (i.bin, i.name_key) i.bin, i.name_key,
            NULLIF(i.name_ru, ''),
            CASE WHEN i.kk_bad = '' THEN NULLIF(i.name_kk, '') END
       FROM hx_import i
      WHERE i.name_key <> ''
        AND (i.name_bad = '' OR NOT EXISTS (SELECT 1 FROM hx_prev p WHERE p.bin = i.bin))
      ORDER BY i.bin, i.name_key
     ON CONFLICT (bin, name_key) DO UPDATE
        SET name_ru = EXCLUDED.name_ru,
            name_kk = COALESCE(EXCLUDED.name_kk, company_names.name_kk)
      WHERE ${CLEAN("EXCLUDED.name_ru")}
        AND (company_names.name_ru IS DISTINCT FROM EXCLUDED.name_ru
             OR (EXCLUDED.name_kk IS NOT NULL
                 AND company_names.name_kk IS DISTINCT FROM EXCLUDED.name_kk))`,
  );
  log(
    `Названия: добавлено или обновлено ${newNames.rowCount}. Подготовка состояний...`,
  );

  await client.query("DROP TABLE IF EXISTS hx_state");
  await client.query(
    `CREATE UNLOGGED TABLE hx_state AS
     SELECT i.bin,
            CASE WHEN i.name_bad <> '' AND pr.bin IS NOT NULL THEN pr.name_id ELSE n.id END AS name_id,
            CASE WHEN i.dir_bad <> '' AND pr.bin IS NOT NULL THEN pr.director_id ELSE d.id END AS director_id,
            CASE WHEN i.addr_bad <> '' AND pr.bin IS NOT NULL THEN pr.address_id ELSE a.id END AS address_id,
            CASE WHEN i.addr_bad <> '' AND pr.bin IS NOT NULL THEN pr.unit ELSE NULLIF(i.unit, '') END AS unit,
            CASE WHEN i.addr_bad <> '' AND pr.bin IS NOT NULL THEN pr.unit_id ELSE u.id END AS unit_id,
            NULLIF(i.oked_code, '') AS oked_code, NULLIF(i.secondary_oked, '') AS secondary_oked,
            NULLIF(i.krp_code, '') AS krp_code, NULLIF(i.kse_code, '') AS kse_code,
            NULLIF(i.kfs_code, '') AS kfs_code,
            (i.name_bad <> '' OR i.dir_bad <> '' OR i.addr_bad <> '') AS broken
       FROM (SELECT DISTINCT ON (bin) * FROM hx_import ORDER BY bin) i
       LEFT JOIN hx_prev pr ON pr.bin = i.bin
       LEFT JOIN company_names n ON n.bin = i.bin AND n.name_key = i.name_key
       LEFT JOIN directors d ON d.name_key = i.director_key
       LEFT JOIN addresses a ON a.addr_key = i.addr_key
       LEFT JOIN units u ON u.address_id = a.id AND u.unit_key = i.unit_key`,
  );
  await client.query("CREATE INDEX ON hx_state (bin)");
  const brokenCount = await client.query(
    "SELECT count(*)::int AS count FROM hx_state WHERE broken",
  );
  log(
    `Компаний с битыми значениями: ${brokenCount.rows[0].count}. Обновление периодов...`,
  );

  let extended = 0;
  if (previous) {
    const result = await client.query(
      `UPDATE company_periods p
          SET to_on = $1::date,
              kse_code = CASE WHEN $3::boolean AND NOT $4::boolean THEN n.kse_code ELSE p.kse_code END,
              kfs_code = CASE WHEN $3::boolean AND NOT $4::boolean THEN n.kfs_code ELSE p.kfs_code END
         FROM hx_state n
        WHERE p.to_on = $2::date
          AND p.bin = n.bin
          AND p.name_id IS NOT DISTINCT FROM n.name_id
          AND p.director_id IS NOT DISTINCT FROM n.director_id
          AND p.address_id IS NOT DISTINCT FROM n.address_id
          AND p.unit_id IS NOT DISTINCT FROM n.unit_id
          AND p.oked_code IS NOT DISTINCT FROM n.oked_code
          AND p.secondary_oked IS NOT DISTINCT FROM n.secondary_oked
          AND p.krp_code IS NOT DISTINCT FROM n.krp_code
          AND (NOT ($3::boolean AND $4::boolean)
               OR (p.kse_code IS NOT DISTINCT FROM n.kse_code
                   AND p.kfs_code IS NOT DISTINCT FROM n.kfs_code))`,
      [takenOn, previous.taken_on, HAS_CODES, previous.has_codes],
    );
    extended = result.rowCount;
  }

  const created = await client.query(
    `INSERT INTO company_periods (bin, from_on, to_on, name_id, director_id, address_id,
                                  unit_id, unit, oked_code, secondary_oked, krp_code, kse_code, kfs_code)
     SELECT n.bin, $1::date, $1::date, n.name_id, n.director_id, n.address_id,
            n.unit_id, n.unit, n.oked_code, n.secondary_oked, n.krp_code, n.kse_code, n.kfs_code
       FROM hx_state n
      WHERE NOT EXISTS (
        SELECT 1 FROM company_periods p WHERE p.bin = n.bin AND p.to_on = $1::date)`,
    [takenOn],
  );
  log(`Периоды: продлено ${extended}, новых ${created.rowCount}.`);

  await client.query(
    "UPDATE snapshots SET rows_total = (SELECT count(*) FROM hx_state) WHERE id = $1",
    [snapshotId],
  );

  await client.query("COMMIT");
  log("Срез сохранён. Обновление статистики...");

  await client.query("DROP TABLE hx_import");
  await client.query("DROP TABLE IF EXISTS hx_state");
  await client.query("DROP TABLE IF EXISTS hx_prev");
  for (const table of [
    "territories",
    "company_names",
    "directors",
    "addresses",
    "units",
    "company_periods",
  ]) {
    await client.query(`ANALYZE ${table}`);
  }

  log(
    `Готово. Территорий: ${regions.size} областей, ${districts.size} районов, ${localities.size} населённых пунктов.`,
  );
  log(`Строк пропущено (нет БИН): ${skipped}.`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Ошибка, срез не сохранён:", error.message);
  process.exit(1);
}

await client.end();
process.exit(0);
