import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import ExcelJS from "exceljs";
import { detectColumns } from "./lib/columns.mjs";

const root = process.argv[2];
if (!root) {
  console.error('Использование: node check-columns.mjs "папка с архивом"');
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(join(dir, entry.name))
      : /^reestr_\d{4}-\d{2}-\d{2}\.xlsx$/i.test(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );

const files = walk(root).sort((a, b) => basename(a).localeCompare(basename(b)));

for (const file of files) {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(file, {
    worksheets: "emit",
    sharedStrings: "cache",
    styles: "ignore",
    hyperlinks: "ignore",
  });

  let layout = null;
  let checked = 0;

  search: for await (const sheet of reader) {
    for await (const row of sheet) {
      checked += 1;
      layout = detectColumns(row.values);
      if (layout || checked >= 30) break search;
    }
  }

  const name = basename(file);
  if (!layout) {
    console.log(`${name}: заголовок не найден`);
    continue;
  }

  const { map, missing, unknown, hasCodes } = layout;
  console.log(
    `${name}: полей ${Object.keys(map).length}, КСЭ/КФС ${hasCodes ? "есть" : "нет"}, КАТО ${map.kato}, адрес ${map.legal_address}, руководитель ${map.director_name}` +
      (missing.length ? `, НЕТ: ${missing.join(", ")}` : "") +
      (unknown.length ? `, неизвестные: ${unknown.join(" | ")}` : ""),
  );
}

process.exit(0);
