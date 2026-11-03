import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = process.argv[2];
if (!root) {
  console.error('Использование: node load-archive.mjs "папка с архивом"');
  process.exit(1);
}
if (!process.env.DATABASE_PASSWORD) {
  console.error("Не задан DATABASE_PASSWORD (пароль пользователя strapi).");
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

const client = new pg.Client({
  host: process.env.DATABASE_HOST || "127.0.0.1",
  port: Number(process.env.DATABASE_PORT) || 5432,
  database: process.env.DATABASE_NAME || "zhkh24_uchet",
  user: process.env.DATABASE_USERNAME || "strapi",
  password: process.env.DATABASE_PASSWORD,
});
await client.connect();
const latest = (
  await client.query(
    "SELECT max(taken_on)::text AS latest FROM snapshots WHERE NOT is_test",
  )
).rows[0].latest;
await client.end();

const files = walk(root)
  .sort((a, b) => basename(a).localeCompare(basename(b)))
  .filter((file) => !latest || dateOf(file) > latest);

console.log(
  `Файлов к загрузке: ${files.length}` +
    (latest
      ? `, последний загруженный срез ${latest}`
      : ", база истории пустая"),
);

const script = fileURLToPath(new URL("./import-snapshot.mjs", import.meta.url));
const started = Date.now();

for (const [index, file] of files.entries()) {
  const date = dateOf(file);
  const minutes = Math.round((Date.now() - started) / 60000);
  console.log("");
  console.log(
    `=== ${index + 1}/${files.length}: ${date} (прошло ${minutes} мин) ===`,
  );

  const result = spawnSync(
    process.execPath,
    ["--max-old-space-size=8192", script, file, date],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    console.error("");
    console.error(
      `Остановлено на ${date} (код ${result.status}). Если файл завис на чтении, пересохрани его в Excel и запусти скрипт снова — он продолжит с этого месяца.`,
    );
    process.exit(1);
  }
}

console.log("");
console.log(
  `Архив загружен за ${Math.round((Date.now() - started) / 60000)} мин.`,
);
process.exit(0);
