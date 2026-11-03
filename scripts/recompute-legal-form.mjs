import pg from "pg";
import { legalFormOf, splitName } from "./lib/keys.mjs";

const APPLY = process.argv.includes("--apply");
const BATCH = 5000;
const SAMPLES = 3;

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
  "SELECT bin, name_ru, name_kk, legal_form FROM companies",
);

const changes = [];
const moves = new Map();

for (const row of rows) {
  const name = row.name_ru || row.name_kk || "";
  const next = legalFormOf(splitName(name).form);
  if (next === row.legal_form) continue;
  changes.push([row.bin, next]);
  const key = `${row.legal_form ?? "null"} -> ${next}`;
  const move = moves.get(key) || { count: 0, samples: [] };
  move.count += 1;
  if (move.samples.length < SAMPLES) move.samples.push(name);
  moves.set(key, move);
}

console.log(`Компаний: ${rows.length}, изменится: ${changes.length}`);
for (const [key, move] of [...moves].sort((a, b) => b[1].count - a[1].count)) {
  console.log(`${String(move.count).padStart(8)}  ${key}`);
  for (const sample of move.samples) console.log(`            ${sample}`);
}

if (APPLY && changes.length > 0) {
  await client.query("BEGIN");
  for (let i = 0; i < changes.length; i += BATCH) {
    const part = changes.slice(i, i + BATCH);
    await client.query(
      `UPDATE companies c
          SET legal_form = s.legal_form
         FROM unnest($1::text[], $2::text[]) AS s(bin, legal_form)
        WHERE c.bin = s.bin`,
      [part.map((p) => p[0]), part.map((p) => p[1])],
    );
  }
  await client.query("COMMIT");
  console.log("Записано в базу.");
} else if (!APPLY) {
  console.log("Режим просмотра. Для записи запусти с --apply.");
}

await client.end();
