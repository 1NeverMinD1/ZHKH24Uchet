import ExcelJS from "exceljs";

const [, , filePath, limitArg] = process.argv;
const LIMIT = Number(limitArg) || 100;
const DRY = process.argv.includes("--dry");
const API = process.env.STRAPI_URL || "http://localhost:1337/api";
const TOKEN = process.env.STRAPI_TOKEN;

if (!filePath) {
  console.error(
    'Использование: node import-companies.mjs "путь\\к\\файлу.xlsx" 100',
  );
  process.exit(1);
}
if (!DRY && !TOKEN) {
  console.error(
    "Не задан STRAPI_TOKEN. Для проверки без отправки добавь --dry",
  );
  process.exit(1);
}

const clean = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value.richText)
      return clean(value.richText.map((t) => t.text).join(""));
    if (value.result !== undefined) return clean(value.result);
    if (value.text !== undefined) return clean(value.text);
    if (value instanceof Date) return "";
  }
  return String(value).replace(/\s+/g, " ").trim();
};

const toIsoDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().slice(0, 10);
};

const toRecord = (v) => {
  const bin = clean(v[1]);
  if (!/^\d{12}$/.test(bin)) return null;

  const nameRu = clean(v[3]);
  if (!nameRu) return null;

  return {
    bin,
    name_kk: clean(v[2]),
    name_ru: nameRu,
    registration_date: toIsoDate(v[4]),
    oked_code: clean(v[5]),
    oked_name_kk: clean(v[6]),
    oked_name_ru: clean(v[7]),
    secondary_oked: clean(v[8]),
    krp_code: clean(v[9]),
    krp_name_kk: clean(v[10]),
    krp_name_ru: clean(v[11]),
    kse_code: clean(v[12]),
    kse_name_kk: clean(v[13]),
    kse_name_ru: clean(v[14]),
    kfs_code: clean(v[15]),
    kfs_name_kk: clean(v[16]),
    kfs_name_ru: clean(v[17]),
    kato: clean(v[18]),
    locality_kk: clean(v[19]),
    locality_ru: clean(v[20]),
    legal_address: clean(v[21]),
    director_name: clean(v[22]),
  };
};

const send = async (record) => {
  const response = await fetch(`${API}/companies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ data: record }),
  });

  if (response.ok) return "created";

  const body = await response.json().catch(() => ({}));
  const message = body?.error?.message || `HTTP ${response.status}`;
  if (response.status === 400 && /unique/i.test(message)) return "duplicate";
  throw new Error(`${record.bin}: ${message}`);
};

const stats = { read: 0, skipped: 0, created: 0, duplicate: 0, failed: 0 };
const preview = [];

const reader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
  worksheets: "emit",
  sharedStrings: "cache",
  styles: "cache",
  hyperlinks: "ignore",
});

outer: for await (const sheet of reader) {
  for await (const row of sheet) {
    if (row.number === 1) continue;

    stats.read += 1;
    const record = toRecord(row.values);

    if (!record) {
      stats.skipped += 1;
      continue;
    }

    if (DRY) {
      stats.created += 1;
      if (preview.length < 2) preview.push(record);
    } else {
      try {
        const result = await send(record);
        stats[result] += 1;
      } catch (error) {
        stats.failed += 1;
        console.error(error.message);
      }
    }

    if (stats.created + stats.duplicate + stats.failed >= LIMIT) break outer;
  }
  break;
}

if (DRY) {
  console.log("Пример записей:");
  console.log(JSON.stringify(preview, null, 2));
}
console.log(
  `Прочитано строк: ${stats.read}, пропущено (нет БИН или названия): ${stats.skipped}, ` +
    `${DRY ? "готово к загрузке" : "создано"}: ${stats.created}, ` +
    `дубликатов: ${stats.duplicate}, ошибок: ${stats.failed}`,
);
process.exit(0);
