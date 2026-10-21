const RESTRICT_GUESTS = false;

const PAGE_SIZE = 20;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
         (base_id, end_id, bin, unit, director_from, director_to,
          address_from, address_to, kato, name_ru, name_kk)
       WITH changed AS MATERIALIZED (
         SELECT e.bin, e.unit,
                b.director_id AS director_from, e.director_id AS director_to,
                b.address_id AS address_from, e.address_id AS address_to
           FROM company_states e
           JOIN company_states b ON b.bin = e.bin AND b.snapshot_id = ?
          WHERE e.snapshot_id = ?
            AND (b.director_id IS DISTINCT FROM e.director_id
                 OR b.address_id IS DISTINCT FROM e.address_id)
       )
       SELECT ?, ?, ch.bin, ch.unit, ch.director_from, ch.director_to,
              ch.address_from, ch.address_to, t.kato, c.name_ru, c.name_kk
         FROM changed ch
         LEFT JOIN addresses a ON a.id = ch.address_to
         LEFT JOIN territories t ON t.id = a.territory_id
         LEFT JOIN LATERAL (
           SELECT name_ru, name_kk FROM companies WHERE bin = ch.bin LIMIT 1
         ) c ON true`,
      [baseId, endId, baseId, endId],
    );
  });
};

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

    const page = Math.max(parseInt(String(ctx.query.page || "1"), 10) || 1, 1);
    const meta: any = {
      page,
      pageSize: PAGE_SIZE,
      total: 0,
      base: toSnapshot(base),
      end: toSnapshot(end),
    };

    if (!base || !end || base.id === end.id) {
      meta.reason = "need_two_snapshots";
      ctx.body = { data: [], meta };
      return;
    }

    const kinds = String(ctx.query.changed || "director,address").split(",");
    const conditions: string[] = [];
    if (kinds.includes("director")) {
      conditions.push("d.director_from IS DISTINCT FROM d.director_to");
    }
    if (kinds.includes("address")) {
      conditions.push("d.address_from IS DISTINCT FROM d.address_to");
    }
    if (conditions.length === 0) {
      return ctx.badRequest("Не выбрано, какие изменения искать");
    }

    const district = String(ctx.query.district || "")
      .replace(/\D/g, "")
      .slice(0, 4);
    const region = String(ctx.query.region || "")
      .replace(/\D/g, "")
      .slice(0, 2);
    const prefix =
      district.length === 4 ? district : region.length === 2 ? region : "";

    await ensureDiff(base.id, end.id);

    const bindings: any[] = [base.id, end.id];
    let territoryFilter = "";
    if (prefix) {
      territoryFilter = "AND d.kato LIKE ?";
      bindings.push(`${prefix}%`);
    }
    bindings.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);

    const list = await rows(
      `WITH page AS (
         SELECT d.*, count(*) OVER () AS total
           FROM snapshot_diffs d
          WHERE d.base_id = ? AND d.end_id = ?
            AND (${conditions.join(" OR ")})
            ${territoryFilter}
          ORDER BY d.name_ru NULLS LAST, d.bin
          LIMIT ? OFFSET ?
       )
       SELECT p.*,
              df.name AS director_from_name, dt.name AS director_to_name,
              a_from.address AS address_from_text, a_to.address AS address_to_text,
              t_from.path_ru AS address_from_place, t_to.path_ru AS address_to_place,
              t_from.path_kk AS address_from_place_kk, t_to.path_kk AS address_to_place_kk
         FROM page p
         LEFT JOIN directors df ON df.id = p.director_from
         LEFT JOIN directors dt ON dt.id = p.director_to
         LEFT JOIN addresses a_from ON a_from.id = p.address_from
         LEFT JOIN addresses a_to ON a_to.id = p.address_to
         LEFT JOIN territories t_from ON t_from.id = a_from.territory_id
         LEFT JOIN territories t_to ON t_to.id = a_to.territory_id
        ORDER BY p.name_ru NULLS LAST, p.bin`,
      bindings,
    );

    meta.total = list.length > 0 ? Number(list[0].total) : 0;

    ctx.body = {
      data: list.map((row) => {
        const changes: string[] = [];
        if (row.director_from !== row.director_to) changes.push("director");
        if (row.address_from !== row.address_to) changes.push("address");

        return {
          bin: row.bin,
          nameRu: row.name_ru,
          nameKk: row.name_kk,
          unit: row.unit,
          changes,
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
        };
      }),
      meta,
    };
  },
  async company(ctx: any) {
    if (blocked(ctx)) return ctx.forbidden();

    const bin = String(ctx.params.bin || "").trim();
    if (!/^\d{12}$/.test(bin)) return ctx.badRequest("Неверный БИН");

    const list = await rows(
      `SELECT s.taken_on::text AS taken_on, s.is_test,
              d.id AS director_id, d.name AS director_name,
              a.id AS address_id, a.address AS address_text, t.path_ru AS place, t.path_kk AS place_kk,
              cs.unit
         FROM company_states cs
         JOIN snapshots s ON s.id = cs.snapshot_id
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
        directors: periods(list, "director_id", (item) => ({
          name: item.director_name,
        })),
        addresses: periods(list, "address_id", (item) => ({
          text: item.address_text,
          place: item.place,
          placeKk: item.place_kk,
          unit: item.unit,
        })),
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

    const companies = snapshot
      ? await rows(
          `SELECT cs.bin, cs.unit, c.name_ru, c.name_kk, count(*) OVER () AS total
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
          unit: item.unit,
          nameRu: item.name_ru,
          nameKk: item.name_kk,
        })),
        companiesTotal: companies.length > 0 ? Number(companies[0].total) : 0,
        page,
        pageSize: PAGE_SIZE,
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

    const timeline = await rows(
      `SELECT s.taken_on::text AS taken_on, s.is_test, count(cs.bin)::int AS companies
         FROM snapshots s
         LEFT JOIN company_states cs ON cs.snapshot_id = s.id AND cs.director_id = ?
        GROUP BY s.id, s.taken_on, s.is_test
        ORDER BY s.taken_on`,
      [id],
    );

    const companies = await rows(
      `SELECT cs.bin, c.name_ru, c.name_kk,
              min(s.taken_on)::text AS first_seen, max(s.taken_on)::text AS last_seen,
              bool_or(s.id = ?) AS current, count(*) OVER () AS total
         FROM company_states cs
         JOIN snapshots s ON s.id = cs.snapshot_id
         LEFT JOIN companies c ON c.bin = cs.bin
        WHERE cs.director_id = ?
        GROUP BY cs.bin, c.name_ru, c.name_kk
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
          nameRu: item.name_ru,
          nameKk: item.name_kk,
          firstSeen: item.first_seen,
          lastSeen: item.last_seen,
          current: item.current,
        })),
        companiesTotal: companies.length > 0 ? Number(companies[0].total) : 0,
        page,
        pageSize: PAGE_SIZE,
      },
    };
  },
};
