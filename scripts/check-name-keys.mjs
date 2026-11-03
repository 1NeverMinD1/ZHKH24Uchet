import pg from "pg";
import { nameKeyOf } from "./lib/keys.mjs";

if (!process.env.DATABASE_PASSWORD) {
  console.error("Не задан DATABASE_PASSWORD (пароль пользователя strapi).");
  process.exit(1);
}

const client = new pg.Client({
  host: process.env.DATABASE_HOST || "127.0.0.1",
  port: Number(process.env.DATABASE_PORT) || 5432,
  database: process.env.DATABASE_NAME || "zhkh24_uchet",
  user: process.env.DATABASE_USERNAME || "strapi",
  password: process.env.DATABASE_PASSWORD,
});

await client.connect();

const { rows } = await client.query(
  "SELECT id, bin, name_key, name_ru FROM company_names WHERE name_ru IS NOT NULL",
);

const diffs = [];
for (const row of rows) {
  const key = nameKeyOf(row.name_ru);
  if (key !== row.name_key) diffs.push({ ...row, key });
}

console.log(`Записей: ${rows.length}, ключ отличается: ${diffs.length}`);
for (const d of diffs.slice(0, 15)) {
  console.log(`${d.bin}  ${d.name_ru}`);
  console.log(`    было:  ${d.name_key}`);
  console.log(`    стало: ${d.key}`);
}

await client.end();
