import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = process.argv[2];
const before = process.argv[3] || "2026-01-01";

if (!root) {
  console.error(
    'Использование: node load-companies.mjs "папка с архивом" [до даты]',
  );
  process.exit(1);
}
if (!process.env.DATABASE_PASSWORD || !process.env.SLUG_SECRET) {
  console.error("Нужны DATABASE_PASSWORD и SLUG_SECRET.");
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

const dateOf = (file) => basename(file).match(/\d{4}-\d{2}-\d{2}/)[0];

const files = walk(root)
  .filter((file) => dateOf(file) < before)
  .sort((a, b) => basename(b).localeCompare(basename(a)));

const missingCount = async () => {
  const client = new pg.Client({
    host: "127.0.0.1",
    database: "zhkh24_uchet",
    user: "strapi",
    password: process.env.DATABASE_PASSWORD,
  });
  await client.connect();
  const { rows } = await client.query(
    `SELECT count(*)::int AS count
       FROM (SELECT DISTINCT bin FROM company_periods) p
      WHERE NOT EXISTS (SELECT 1 FROM companies c WHERE c.bin = p.bin)`,
  );
  await client.end();
  return rows[0].count;
};

const script = fileURLToPath(
  new URL("./import-companies-pg.mjs", import.meta.url),
);

for (const [index, file] of files.entries()) {
  const missing = await missingCount();
  console.log("");
  console.log(
    `=== ${index + 1}/${files.length}: ${dateOf(file)}, не хватает компаний: ${missing} ===`,
  );
  if (missing === 0) break;

  const result = spawnSync(
    process.execPath,
    ["--max-old-space-size=8192", script, file, "--insert-only"],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    console.error(`Остановлено на ${dateOf(file)} (код ${result.status}).`);
    process.exit(1);
  }
}

console.log("");
console.log(`Готово. Осталось без страницы: ${await missingCount()}.`);
process.exit(0);
