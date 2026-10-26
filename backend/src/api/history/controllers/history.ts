import {
  parseCompanyFilters,
  toSqlConditions,
} from "../../../utils/company-filters";

const RESTRICT_GUESTS = false;

const PAGE_SIZE = 20;
const MAX_PAGE = 50;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const KINDS = [
  "appeared",
  "disappeared",
  "name",
  "director",
  "address",
  "oked",
  "secondary_oked",
  "krp",
  "kse",
  "kfs",
];

const codeOf = (value: string) => {
  const slug = value.trim().toLowerCase();
  const code = slug.slice(slug.lastIndexOf("-") + 1);
  return /^[0-9a-z]{10}$/.test(code) ? code : "";
};

const getStrapi = (): any => (globalThis as any).strapi;

const rows = async (sql: string, bindings: any[] = []): Promise<any[]> => {
  const result = await getStrapi().db.connection.raw(sql, bindings);
  return result.rows;
};

const blocked = (ctx: any) => RESTRICT_GUESTS && !ctx.state.user;

const loadSnapshots = () =>
  rows(
    "SELECT id, taken_on::text AS taken_on, is_test, rows_total FROM snapshots ORDER BY taken_on",
  );

const toSnapshot = (row: any) =>
  row ? { id: row.id, takenOn: row.taken_on, isTest: row.is_test } : null;

const resolvePair = (snapshots: any[], from?: string, to?: string) => {
  if (snapshots.length === 0) return { base: null, end: null };

  const lastUntil = (date: string) => {
    let found: any = null;
    for (const snapshot of snapshots) {
      if (snapshot.taken_on <= date) found = snapshot;
    }
    return found;
  };

  const end =
    to && DATE_PATTERN.test(to)
      ? lastUntil(to) || snapshots[0]
      : snapshots[snapshots.length - 1];

  let base: any;
  if (from && DATE_PATTERN.test(from)) {
    base = lastUntil(from) || snapshots[0];
  } else {
    const index = snapshots.findIndex((snapshot) => snapshot.id === end.id);
    base = index > 0 ? snapshots[index - 1] : end;
  }

  return { base, end };
};

const directorKey = (value: string) =>
  value
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .replace(/[.,"“”«»'%_\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const placeOf = (row: any, prefix: string) => row[`${prefix}_place`] || null;

const periods = (items: any[], idKey: string, build: (item: any) => any) => {
  const result: any[] = [];
  for (const item of items) {
    const last = result[result.length - 1];
    if (last && last.id === item[idKey]) {
      last.to = item.taken_on;
      continue;
    }
    result.push({
      id: item[idKey],
      from: item.taken_on,
      to: item.taken_on,
      ...build(item),
    });
  }
  return result;
};

const codePeriods = (items: any[], column: string) =>
  periods(items, column, (item) => ({ code: item[column] }));

const ensureDiff = async (baseId: number, endId: number) => {
  const ready = await rows(
    "SELECT 1 FROM snapshot_diff_pairs WHERE base_id = ? AND end_id = ?",
    [baseId, endId],
  );
  if (ready.length > 0) return;

  await getStrapi().db.connection.transaction(async (trx: any) => {
    await trx.raw("SELECT pg_advisory_xact_lock(?, ?)", [baseId, endId]);

    const again = await trx.raw(
      "SELECT 1 FROM snapshot_diff_pairs WHERE base_id = ? AND end_id = ?",
      [baseId, endId],
    );
    if (again.rows.length > 0) return;

    await trx.raw(
      "INSERT INTO snapshot_diff_pairs (base_id, end_id) VALUES (?, ?)",
      [baseId, endId],
    );

    await trx.raw(
      `INSERT INTO snapshot_diffs
         (base_id, end_id, bin, kato, name_ru, name_kk, unit,
          name_from, name_to, director_from, director_to,
          address_from, address_to, oked_from, oked_to,
          secondary_from, secondary_to, krp_from, krp_to,
          kse_from, kse_to, kfs_from, kfs_to, changes)
       WITH pairs AS MATERIALIZED (
         SELECT e.bin, e.unit,
                b.name_id AS name_from, e.name_id AS name_to,
                b.director_id AS director_from, e.director_id AS director_to,
                b.address_id AS address_from, e.address_id AS address_to,
                b.oked_code AS oked_from, e.oked_code AS oked_to,
                b.secondary_oked AS secondary_from, e.secondary_oked AS secondary_to,
                b.krp_code AS krp_from, e.krp_code AS krp_to,
                b.kse_code AS kse_from, e.kse_code AS kse_to,
                b.kfs_code AS kfs_from, e.kfs_code AS kfs_to,
                array_remove(ARRAY[
                  CASE WHEN split_part(nb.name_key, '|', 1) IS DISTINCT FROM split_part(ne.name_key, '|', 1) THEN 'name' END,
                  CASE WHEN b.director_id IS DISTINCT FROM e.director_id THEN 'director' END,
                  CASE WHEN b.address_id IS DISTINCT FROM e.address_id THEN 'address' END,
                  CASE WHEN b.oked_code IS DISTINCT FROM e.oked_code THEN 'oked' END,
                  CASE WHEN b.secondary_oked IS DISTINCT FROM e.secondary_oked THEN 'secondary_oked' END,
                  CASE WHEN b.krp_code IS DISTINCT FROM e.krp_code THEN 'krp' END,
                  CASE WHEN b.kse_code IS DISTINCT FROM e.kse_code THEN 'kse' END,
                  CASE WHEN b.kfs_code IS DISTINCT FROM e.kfs_code THEN 'kfs' END
                ]::text[], NULL) AS changes
           FROM company_states e
           JOIN company_states b ON b.bin = e.bin AND b.snapshot_id = ?
           LEFT JOIN company_names nb ON nb.id = b.name_id
           LEFT JOIN company_names ne ON ne.id = e.name_id
          WHERE e.snapshot_id = ?
       )
       SELECT ?, ?, p.bin, t.kato, n.name_ru, n.name_kk, p.unit,
              p.name_from, p.name_to, p.director_from, p.director_to,
              p.address_from, p.address_to, p.oked_from, p.oked_to,
              p.secondary_from, p.secondary_to, p.krp_from, p.krp_to,
              p.kse_from, p.kse_to, p.kfs_from, p.kfs_to, p.changes
         FROM pairs p
         LEFT JOIN company_names n ON n.id = p.name_to
         LEFT JOIN addresses a ON a.id = p.address_to
         LEFT JOIN territories t ON t.id = a.territory_id
        WHERE cardinality(p.changes) > 0`,
      [baseId, endId, baseId, endId],
    );

    await trx.raw(
      `INSERT INTO snapshot_diffs
         (base_id, end_id, bin, kato, name_ru, name_kk, unit,
          name_to, director_to, address_to, oked_to, secondary_to,
          krp_to, kse_to, kfs_to, changes)
       SELECT ?, ?, e.bin, t.kato, n.name_ru, n.name_kk, e.unit,
              e.name_id, e.director_id, e.address_id, e.oked_code, e.secondary_oked,
              e.krp_code, e.kse_code, e.kfs_code, ARRAY['appeared']::text[]
         FROM company_states e
         LEFT JOIN company_names n ON n.id = e.name_id
         LEFT JOIN addresses a ON a.id = e.address_id
         LEFT JOIN territories t ON t.id = a.territory_id
        WHERE e.snapshot_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM company_states b
             WHERE b.snapshot_id = ? AND b.bin = e.bin)`,
      [baseId, endId, endId, baseId],
    );

    await trx.raw(
      `INSERT INTO snapshot_diffs
         (base_id, end_id, bin, kato, name_ru, name_kk, unit,
          name_from, director_from, address_from, oked_from, secondary_from,
          krp_from, kse_from, kfs_from, changes)
       SELECT ?, ?, b.bin, t.kato, n.name_ru, n.name_kk, b.unit,
              b.name_id, b.director_id, b.address_id, b.oked_code, b.secondary_oked,
              b.krp_code, b.kse_code, b.kfs_code, ARRAY['disappeared']::text[]
         FROM company_states b
         LEFT JOIN company_names n ON n.id = b.name_id
         LEFT JOIN addresses a ON a.id = b.address_id
         LEFT JOIN territories t ON t.id = a.territory_id
        WHERE b.snapshot_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM company_states e
             WHERE e.snapshot_id = ? AND e.bin = b.bin)`,
      [baseId, endId, baseId, endId],
    );
  });
};

const pairOf = (from: any, to: any) => ({ from: from ?? null, to: to ?? null });

const json = (value: any) =>
  typeof value === "string" ? JSON.parse(value) : value || {};

export default {
  async snapshots(ctx: any) {
    if (blocked(ctx)) return ctx.forbidden();
    const list = await loadSnapshots();
    ctx.body = {
      data: list.map((row) => ({
        id: row.id,
        takenOn: row.taken_on,
        isTest: row.is_test,
        rowsTotal: row.rows_total,
      })),
    };
  },

  async stats(ctx: any) {
    if (blocked(ctx)) return ctx.forbidden();

    const parse = (value: any) =>
      typeof value === "string" ? JSON.parse(value) : value || {};

    const list = await rows(
      `SELECT s.taken_on::text AS taken_on, p.taken_on::text AS previous_taken_on,
              st.total, st.appeared, st.disappeared, st.changed,
              st.changes, st.by_form, st.by_region
         FROM snapshot_stats st
         JOIN snapshots s ON s.id = st.snapshot_id
         LEFT JOIN snapshots p ON p.id = st.previous_id
        ORDER BY s.taken_on`,
    );

    const since = list.find(
      (item) => item.previous_taken_on,
    )?.previous_taken_on;

    const registrations = since
      ? await rows(
          `SELECT to_char(date_trunc('month', registration_date), 'YYYY-MM') AS month,
                  count(*)::int AS count
             FROM companies
            WHERE registration_date >= ?::date
            GROUP BY 1
            ORDER BY 1`,
          [since],
        )
      : [];

    ctx.body = {
      data: {
        snapshots: list.map((item) => ({
          takenOn: item.taken_on,
          previousTakenOn: item.previous_taken_on,
          total: item.total,
          appeared: item.appeared,
          disappeared: item.disappeared,
          changed: item.changed,
          changes: parse(item.changes),
          byForm: parse(item.by_form),
          byRegion: parse(item.by_region),
        })),
        registrations,
      },
    };
  },
  async territories(ctx: any) {
    if (blocked(ctx)) return ctx.forbidden();
    const parent = String(ctx.query.parent || "").replace(/\D/g, "");

    const list = parent
      ? await rows(
          "SELECT kato, name_ru, name_kk FROM territories WHERE level = 2 AND kato LIKE ? ORDER BY name_ru",
          [`${parent.slice(0, 2)}%`],
        )
      : await rows(
          "SELECT kato, name_ru, name_kk FROM territories WHERE level = 1 ORDER BY name_ru",
        );

    ctx.body = { data: list };
  },

  async changes(ctx: any) {
    if (blocked(ctx)) return ctx.forbidden();

    const snapshots = await loadSnapshots();
    const { base, end } = resolvePair(
      snapshots,
      ctx.query.from ? String(ctx.query.from) : undefined,
      ctx.query.to ? String(ctx.query.to) : undefined,
    );
    const period = String(ctx.query.mode || "") === "period";

    const page = Math.max(parseInt(String(ctx.query.page || "1"), 10) || 1, 1);
    if (page > MAX_PAGE) return ctx.badRequest("Слишком далёкая страница");
    const meta: any = {
      page,
      pageSize: PAGE_SIZE,
      maxPage: MAX_PAGE,
      total: 0,
      mode: period ? "period" : "compare",
      base: toSnapshot(base),
      end: toSnapshot(end),
    };

    if (!base || !end || base.taken_on >= end.taken_on) {
      meta.reason = "need_two_snapshots";
      ctx.body = { data: [], meta };
      return;
    }

    const requested = String(ctx.query.changed || "director,address")
      .split(",")
      .filter((kind) => KINDS.includes(kind));
    if (requested.length === 0) {
      return ctx.badRequest("Не выбрано, какие изменения искать");
    }

    const filters = parseCompanyFilters(ctx.query);
    const order = String(ctx.query.sort || "") === "name_desc" ? "DESC" : "ASC";
    const q = String(ctx.query.q || "")
      .trim()
      .slice(0, 200);

    const bindings: any[] = [];
    let source: string;

    if (period) {
      const startIndex = snapshots.findIndex((item) => item.id === base.id);
      const endIndex = snapshots.findIndex((item) => item.id === end.id);
      const bases: number[] = [];
      const ends: number[] = [];

      for (let index = startIndex; index < endIndex; index += 1) {
        const from = snapshots[index].id;
        const to = snapshots[index + 1].id;
        bases.push(from);
        ends.push(to);
        await ensureDiff(from, to);
      }

      source = `(
        WITH steps AS (
          SELECT d.*, s.taken_on AS step_on
            FROM snapshot_diffs d
            JOIN snapshots s ON s.id = d.end_id
            JOIN unnest(?::int[], ?::int[]) AS p(base_id, end_id)
              ON p.base_id = d.base_id AND p.end_id = d.end_id
           WHERE d.changes && ?::text[]
        ),
        kinds AS (
          SELECT st.bin, array_agg(DISTINCT kind) AS changes
            FROM steps st, unnest(st.changes) AS kind
           GROUP BY st.bin
        ),
        first_step AS (
          SELECT DISTINCT ON (bin) * FROM steps
           ORDER BY bin, (changes @> '{appeared}'), step_on
        ),
        last_step AS (
          SELECT DISTINCT ON (bin) * FROM steps
           ORDER BY bin, (changes @> '{disappeared}'), step_on DESC
        )
        SELECT k.bin, k.changes, l.kato, l.name_ru, l.name_kk, l.unit,
               f.name_from, l.name_to, f.director_from, l.director_to,
               f.address_from, l.address_to, f.oked_from, l.oked_to,
               f.secondary_from, l.secondary_to, f.krp_from, l.krp_to,
               f.kse_from, l.kse_to, f.kfs_from, l.kfs_to
          FROM kinds k
          JOIN first_step f ON f.bin = k.bin
          JOIN last_step l ON l.bin = k.bin
      ) d`;
      bindings.push(
        `{${bases.join(",")}}`,
        `{${ends.join(",")}}`,
        `{${requested.join(",")}}`,
      );
    } else {
      await ensureDiff(base.id, end.id);
      source =
        "(SELECT * FROM snapshot_diffs WHERE base_id = ? AND end_id = ?) d";
      bindings.push(base.id, end.id);
    }

    bindings.push(`{${requested.join(",")}}`);

    let territoryFilter = "";
    if (filters.prefix) {
      territoryFilter = "AND d.kato LIKE ?";
      bindings.push(`${filters.prefix}%`);
    }

    let textFilter = "";
    if (q) {
      const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
      if (/^\d+$/.test(q)) {
        textFilter = "AND d.bin LIKE ?";
        bindings.push(pattern);
      } else {
        textFilter = "AND (d.name_ru ILIKE ? OR d.name_kk ILIKE ?)";
        bindings.push(pattern, pattern);
      }
    }

    let companyFilter = "";
    const company = toSqlConditions(filters, "c");
    if (company.sql) {
      companyFilter = `AND EXISTS (SELECT 1 FROM companies c WHERE c.bin = d.bin AND ${company.sql})`;
      bindings.push(...company.bindings);
    }

    bindings.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);

    const list = await rows(
      `WITH page AS (
         SELECT d.*, count(*) OVER () AS total
           FROM ${source}
          WHERE d.changes @> ?::text[]
            ${territoryFilter}
            ${textFilter}
            ${companyFilter}
          ORDER BY d.name_ru ${order} NULLS LAST, d.bin
          LIMIT ? OFFSET ?
       )
       SELECT p.*, c.slug,
              nf.name_ru AS name_from_ru, nf.name_kk AS name_from_kk,
              nt.name_ru AS name_to_ru, nt.name_kk AS name_to_kk,
              df.name AS director_from_name, dt.name AS director_to_name,
              a_from.address AS address_from_text, a_to.address AS address_to_text,
              t_from.path_ru AS address_from_place, t_to.path_ru AS address_to_place,
              t_from.path_kk AS address_from_place_kk, t_to.path_kk AS address_to_place_kk
         FROM page p
         LEFT JOIN company_names nf ON nf.id = p.name_from
         LEFT JOIN company_names nt ON nt.id = p.name_to
         LEFT JOIN directors df ON df.id = p.director_from
         LEFT JOIN directors dt ON dt.id = p.director_to
         LEFT JOIN addresses a_from ON a_from.id = p.address_from
         LEFT JOIN addresses a_to ON a_to.id = p.address_to
         LEFT JOIN territories t_from ON t_from.id = a_from.territory_id
         LEFT JOIN territories t_to ON t_to.id = a_to.territory_id
         LEFT JOIN companies c ON c.bin = p.bin
        ORDER BY p.name_ru ${order} NULLS LAST, p.bin`,
      bindings,
    );

    meta.total = list.length > 0 ? Number(list[0].total) : 0;

    ctx.body = {
      data: list.map((row) => ({
        bin: row.bin,
        slug: row.slug,
        nameRu: row.name_ru,
        nameKk: row.name_kk,
        unit: row.unit,
        changes: row.changes,
        name: {
          from: row.name_from
            ? { ru: row.name_from_ru, kk: row.name_from_kk }
            : null,
          to: row.name_to ? { ru: row.name_to_ru, kk: row.name_to_kk } : null,
        },
        director: {
          from: row.director_from
            ? { id: row.director_from, name: row.director_from_name }
            : null,
          to: row.director_to
            ? { id: row.director_to, name: row.director_to_name }
            : null,
        },
        address: {
          from: row.address_from
            ? {
                id: row.address_from,
                text: row.address_from_text,
                place: placeOf(row, "address_from"),
                placeKk: row.address_from_place_kk,
              }
            : null,
          to: row.address_to
            ? {
                id: row.address_to,
                text: row.address_to_text,
                place: placeOf(row, "address_to"),
                placeKk: row.address_to_place_kk,
              }
            : null,
        },
        oked: pairOf(row.oked_from, row.oked_to),
        secondaryOked: pairOf(row.secondary_from, row.secondary_to),
        krp: pairOf(row.krp_from, row.krp_to),
        kse: pairOf(row.kse_from, row.kse_to),
        kfs: pairOf(row.kfs_from, row.kfs_to),
      })),
      meta,
    };
  },
  async company(ctx: any) {
    if (blocked(ctx)) return ctx.forbidden();

    const code = codeOf(String(ctx.params.slug || ""));
    if (!code) return ctx.notFound("История не найдена");

    const found = await rows(
      "SELECT bin FROM companies WHERE slug_code = ? LIMIT 1",
      [code],
    );
    if (found.length === 0) return ctx.notFound("История не найдена");
    const bin = found[0].bin;

    const list = await rows(
      `SELECT s.taken_on::text AS taken_on, s.is_test,
              n.name_ru, n.name_kk, split_part(n.name_key, '|', 1) AS name_key_ru,
              d.id AS director_id, d.name AS director_name,
              a.id AS address_id, a.address AS address_text, t.path_ru AS place, t.path_kk AS place_kk,
              cs.unit, cs.oked_code, cs.secondary_oked, cs.krp_code, cs.kse_code, cs.kfs_code
         FROM company_states cs
         JOIN snapshots s ON s.id = cs.snapshot_id
         LEFT JOIN company_names n ON n.id = cs.name_id
         LEFT JOIN directors d ON d.id = cs.director_id
         LEFT JOIN addresses a ON a.id = cs.address_id
         LEFT JOIN territories t ON t.id = a.territory_id
        WHERE cs.bin = ?
        ORDER BY s.taken_on`,
      [bin],
    );

    if (list.length === 0) return ctx.notFound("История не найдена");

    const snapshots = await loadSnapshots();

    ctx.body = {
      data: {
        bin,
        firstSeen: list[0].taken_on,
        lastSeen: list[list.length - 1].taken_on,
        snapshotsTotal: snapshots.length,
        snapshotsPresent: list.length,
        names: periods(list, "name_key_ru", (item) => ({
          ru: item.name_ru,
          kk: item.name_kk,
        })),
        directors: periods(list, "director_id", (item) => ({
          name: item.director_name,
        })),
        addresses: periods(list, "address_id", (item) => ({
          text: item.address_text,
          place: item.place,
          placeKk: item.place_kk,
          unit: item.unit,
        })),
        oked: codePeriods(list, "oked_code"),
        secondaryOked: codePeriods(list, "secondary_oked"),
        krp: codePeriods(list, "krp_code"),
        kse: codePeriods(list, "kse_code"),
        kfs: codePeriods(list, "kfs_code"),
        isTest: list.some((item) => item.is_test),
      },
    };
  },

  async address(ctx: any) {
    if (blocked(ctx)) return ctx.forbidden();

    const id = parseInt(String(ctx.params.id || ""), 10);
    if (!Number.isInteger(id) || id < 1)
      return ctx.badRequest("Неверный адрес");

    const info = await rows(
      `SELECT a.id, a.address, a.street_type, a.street, a.house,
              t.path_ru AS place, t.path_kk AS place_kk, t.kato
         FROM addresses a
         LEFT JOIN territories t ON t.id = a.territory_id
        WHERE a.id = ?`,
      [id],
    );
    if (info.length === 0) return ctx.notFound("Адрес не найден");

    const timeline = await rows(
      `SELECT s.taken_on::text AS taken_on, s.is_test, count(cs.bin)::int AS companies
         FROM snapshots s
         LEFT JOIN company_states cs ON cs.snapshot_id = s.id AND cs.address_id = ?
        GROUP BY s.id, s.taken_on, s.is_test
        ORDER BY s.taken_on`,
      [id],
    );

    const snapshots = await loadSnapshots();
    const requested = ctx.query.date ? String(ctx.query.date) : "";
    const snapshot =
      snapshots.find((item) => item.taken_on === requested) ||
      snapshots[snapshots.length - 1];

    const page = Math.max(parseInt(String(ctx.query.page || "1"), 10) || 1, 1);
    if (page > MAX_PAGE) return ctx.badRequest("Слишком далёкая страница");

    const companies = snapshot
      ? await rows(
          `SELECT cs.bin, cs.unit, c.slug, c.name_ru, c.name_kk, count(*) OVER () AS total
             FROM company_states cs
             LEFT JOIN companies c ON c.bin = cs.bin
            WHERE cs.snapshot_id = ? AND cs.address_id = ?
            ORDER BY c.name_ru NULLS LAST, cs.bin
            LIMIT ? OFFSET ?`,
          [snapshot.id, id, PAGE_SIZE, (page - 1) * PAGE_SIZE],
        )
      : [];

    const row = info[0];
    ctx.body = {
      data: {
        id: row.id,
        text: row.address,
        streetType: row.street_type,
        street: row.street,
        house: row.house,
        place: row.place,
        placeKk: row.place_kk,
        kato: row.kato,
        timeline: timeline.map((item) => ({
          takenOn: item.taken_on,
          isTest: item.is_test,
          companies: item.companies,
        })),
        snapshot: toSnapshot(snapshot),
        companies: companies.map((item) => ({
          bin: item.bin,
          slug: item.slug,
          unit: item.unit,
          nameRu: item.name_ru,
          nameKk: item.name_kk,
        })),
        companiesTotal: companies.length > 0 ? Number(companies[0].total) : 0,
        page,
        pageSize: PAGE_SIZE,
        maxPage: MAX_PAGE,
      },
    };
  },

  async directors(ctx: any) {
    if (blocked(ctx)) return ctx.forbidden();

    const key = directorKey(String(ctx.query.q || ""));
    if (key.length < 4) {
      ctx.body = { data: [] };
      return;
    }

    const limit = Math.min(
      Math.max(parseInt(String(ctx.query.limit || "5"), 10) || 5, 1),
      20,
    );

    const snapshots = await loadSnapshots();
    const latest = snapshots[snapshots.length - 1];
    if (!latest) {
      ctx.body = { data: [] };
      return;
    }

    const list = await rows(
      `WITH matched AS (
         SELECT id, name FROM directors WHERE name_key LIKE ?
       )
       SELECT m.id, m.name, count(cs.bin)::int AS companies
         FROM matched m
         LEFT JOIN company_states cs ON cs.director_id = m.id AND cs.snapshot_id = ?
        GROUP BY m.id, m.name
        ORDER BY companies DESC, m.name
        LIMIT ?`,
      [`%${key}%`, latest.id, limit],
    );

    ctx.body = { data: list };
  },

  async director(ctx: any) {
    if (blocked(ctx)) return ctx.forbidden();

    const id = parseInt(String(ctx.params.id || ""), 10);
    if (!Number.isInteger(id) || id < 1)
      return ctx.badRequest("Неверный руководитель");

    const info = await rows("SELECT id, name FROM directors WHERE id = ?", [
      id,
    ]);
    if (info.length === 0) return ctx.notFound("Руководитель не найден");

    const snapshots = await loadSnapshots();
    const latest = snapshots[snapshots.length - 1];
    const page = Math.max(parseInt(String(ctx.query.page || "1"), 10) || 1, 1);
    if (page > MAX_PAGE) return ctx.badRequest("Слишком далёкая страница");

    const timeline = await rows(
      `SELECT s.taken_on::text AS taken_on, s.is_test, count(cs.bin)::int AS companies
         FROM snapshots s
         LEFT JOIN company_states cs ON cs.snapshot_id = s.id AND cs.director_id = ?
        GROUP BY s.id, s.taken_on, s.is_test
        ORDER BY s.taken_on`,
      [id],
    );

    const companies = await rows(
      `SELECT cs.bin, c.slug, c.name_ru, c.name_kk,
              min(s.taken_on)::text AS first_seen, max(s.taken_on)::text AS last_seen,
              bool_or(s.id = ?) AS current, count(*) OVER () AS total
         FROM company_states cs
         JOIN snapshots s ON s.id = cs.snapshot_id
         LEFT JOIN companies c ON c.bin = cs.bin
        WHERE cs.director_id = ?
        GROUP BY cs.bin, c.slug, c.name_ru, c.name_kk
        ORDER BY bool_or(s.id = ?) DESC, c.name_ru NULLS LAST, cs.bin
        LIMIT ? OFFSET ?`,
      [
        latest ? latest.id : 0,
        id,
        latest ? latest.id : 0,
        PAGE_SIZE,
        (page - 1) * PAGE_SIZE,
      ],
    );

    ctx.body = {
      data: {
        id: info[0].id,
        name: info[0].name,
        currentCompanies:
          timeline.length > 0 ? timeline[timeline.length - 1].companies : 0,
        timeline: timeline.map((item) => ({
          takenOn: item.taken_on,
          isTest: item.is_test,
          companies: item.companies,
        })),
        companies: companies.map((item) => ({
          bin: item.bin,
          slug: item.slug,
          nameRu: item.name_ru,
          nameKk: item.name_kk,
          firstSeen: item.first_seen,
          lastSeen: item.last_seen,
          current: item.current,
        })),
        companiesTotal: companies.length > 0 ? Number(companies[0].total) : 0,
        page,
        pageSize: PAGE_SIZE,
        maxPage: MAX_PAGE,
      },
    };
  },
};
