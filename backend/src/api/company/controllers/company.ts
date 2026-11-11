import fs from "node:fs";
import path from "node:path";
import { factories } from "@strapi/strapi";
import { renderCompanyCard, summarizeChanges } from "../../../utils/og-image";
import {
  companyHead,
  injectHead,
  notFoundHead,
  readIndex,
} from "../../../utils/seo-page";
import {
  LEGAL_FORMS,
  parseCompanyFilters,
  toDocumentFilters,
  toSqlConditions,
} from "../../../utils/company-filters";

const RESTRICT_GUESTS = false;

const PUBLIC_FIELDS: any = [
  "bin",
  "slug",
  "legal_form",
  "status",
  "last_seen",
  "name_ru",
  "name_kk",
  "oked_code",
  "oked_name_ru",
  "oked_name_kk",
  "locality_ru",
  "locality_kk",
];

const MEMBER_FIELDS: any = [
  ...PUBLIC_FIELDS,
  "registration_date",
  "secondary_oked",
  "krp_code",
  "krp_name_ru",
  "krp_name_kk",
  "kse_code",
  "kse_name_ru",
  "kse_name_kk",
  "kfs_code",
  "kfs_name_ru",
  "kfs_name_kk",
  "kato",
  "legal_address",
  "director_name",
];

const SITEMAP_FIELDS: any = ["slug", "updatedAt"];
const SITEMAP_LOCALES = ["ru", "kk"];
const DEFAULT_LOCALE = "ru";

const PAGE_SIZE = 20;
const MAX_PAGE = 50;
const SITEMAP_CHUNK = 10000;
const SITEMAP_TTL = 60 * 60 * 1000;
const FILTERS_TTL = 60 * 60 * 1000;
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n';

const siteUrl = () =>
  (process.env.SITE_URL || "http://localhost:5173").replace(/\/$/, "");

const pageOf = (ctx: any) =>
  Math.max(parseInt(String(ctx.query.page || "1"), 10) || 1, 1);

const codeOf = (value: string) => {
  const slug = value.trim().toLowerCase();
  const code = slug.slice(slug.lastIndexOf("-") + 1);
  return /^[0-9a-z]{10}$/.test(code) ? code : "";
};

const strip = ({ id, documentId, ...rest }: any) => rest;

const SORTS: Record<string, any> = {
  name_asc: "sort_name:asc",
  name_desc: "sort_name:desc",
  newest: ["registration_date:desc", "sort_name:asc"],
  oldest: ["registration_date:asc", "sort_name:asc"],
};

const sortOf = (ctx: any) => {
  const key = String(ctx.query.sort || "");
  return SORTS[key] ? key : "";
};

const byDate = (key: string) => key === "newest" || key === "oldest";

const searchText = (value: string) =>
  value
    .replace(/[«»"“”„'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const cache = new Map<string, { at: number; xml: string }>();

const cached = async (key: string, build: () => Promise<string>) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < SITEMAP_TTL) return hit.xml;

  const xml = await build();
  if (xml) cache.set(key, { at: Date.now(), xml });
  return xml;
};

let filtersCache: { at: number; data: any } | null = null;

const CATALOG_PAGE_SIZE = 100;
const CATALOG_TTL = 60 * 60 * 1000;
const LETTER_SQL =
  "(CASE WHEN left(sort_name, 1) ~ '[0-9]' THEN '0' ELSE upper(left(sort_name, 1)) END)";
const LETTER_PATTERN = /^[0-9A-ZА-ЯЁӘҒҚҢӨҰҮҺІ]$/u;
let catalogCache: { at: number; data: any } | null = null;

const COUNT_TTL = 10 * 60 * 1000;
const COUNT_CAP = 100000;
const counts = new Map<string, { at: number; total: number }>();

const cachedCount = async (key: string, run: () => Promise<number>) => {
  const hit = counts.get(key);
  if (hit && Date.now() - hit.at < COUNT_TTL) return hit.total;
  const total = await run();
  if (counts.size > 1000) counts.clear();
  counts.set(key, { at: Date.now(), total });
  return total;
};

const urlset = (entries: string[]) =>
  XML_HEAD +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
  entries.join("\n") +
  "\n</urlset>\n";

const pageEntries = (base: string, path: string, lastmod = "") => {
  const versions = SITEMAP_LOCALES.map((code) => ({
    code,
    href: `${base}/${code}${path}`,
  }));
  const fallback = versions.find((item) => item.code === DEFAULT_LOCALE);
  const links =
    versions
      .map(
        (item) =>
          `<xhtml:link rel="alternate" hreflang="${item.code}" href="${escapeXml(item.href)}"/>`,
      )
      .join("") +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml((fallback || versions[0]).href)}"/>`;
  return versions.map(
    (item) =>
      `  <url><loc>${escapeXml(item.href)}</loc>${
        lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
      }${links}</url>`,
  );
};

const sendXml = (ctx: any, xml: string) => {
  ctx.type = "application/xml";
  ctx.set("Cache-Control", "public, max-age=3600");
  ctx.body = xml;
};

export default factories.createCoreController(
  "api::company.company",
  ({ strapi }) => {
    const raw = async (sql: string) =>
      (await strapi.db.connection.raw(sql)).rows;

    const dictionary = (column: string) =>
      raw(
        `SELECT ${column}_code AS code,
                max(${column}_name_ru) AS name_ru,
                max(${column}_name_kk) AS name_kk,
                count(*)::int AS count
           FROM companies
                    WHERE ${column}_code IS NOT NULL
            AND status IS DISTINCT FROM 'gone'
          GROUP BY ${column}_code
          ORDER BY ${column}_code`,
      );

    let addressCache: { at: number; ids: number[] } | null = null;

    const indexedAddressIds = async () => {
      if (!addressCache || Date.now() - addressCache.at > SITEMAP_TTL) {
        const list = await raw(
          `SELECT address_id AS id
             FROM company_periods
            WHERE address_id IS NOT NULL
            GROUP BY address_id
           HAVING count(DISTINCT bin) >= 3
            ORDER BY address_id`,
        );
        addressCache = { at: Date.now(), ids: list.map((row: any) => row.id) };
      }
      return addressCache.ids;
    };

    const countCapped = async (parsed: any, q: string, dated: boolean) => {
      const where: string[] = [];
      const bindings: any[] = [];

      if (q) {
        if (/^\d+$/.test(q)) {
          where.push("c.bin LIKE ?");
          bindings.push(`%${q}%`);
        } else {
          for (const word of q.split(" ").filter(Boolean)) {
            const pattern = `%${word.replace(/[\\%_]/g, "\\$&")}%`;
            where.push("(c.name_ru ILIKE ? OR c.name_kk ILIKE ?)");
            bindings.push(pattern, pattern);
          }
        }
      }

      if (parsed.prefix) {
        where.push("c.kato LIKE ?");
        bindings.push(`${parsed.prefix}%`);
      }

      const company = toSqlConditions(
        { ...parsed, status: parsed.status || "active" },
        "c",
      );
      if (company.sql) {
        where.push(company.sql);
        bindings.push(...company.bindings);
      }

      if (dated) where.push("c.registration_date IS NOT NULL");

      const total = await cachedCount(
        JSON.stringify({ parsed, q, dated }),
        async () => {
          const result = await strapi.db.connection.raw(
            `SELECT count(*)::int AS total
               FROM (SELECT 1 FROM companies c
                     ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
                     LIMIT ${COUNT_CAP + 1}) x`,
            bindings,
          );
          return result.rows[0].total;
        },
      );

      return { total: Math.min(total, COUNT_CAP), capped: total > COUNT_CAP };
    };

    return {
      async search(ctx: any) {
        const q = searchText(String(ctx.query.q || ""));
        if (!q) {
          return ctx.badRequest("Пустой запрос");
        }

        const page = pageOf(ctx);
        if (page > MAX_PAGE) {
          return ctx.badRequest("Слишком далёкая страница");
        }

        const byBin = /^\d+$/.test(q);
        const textFilter: any = byBin
          ? { bin: { $contains: q } }
          : {
              $and: q
                .split(" ")
                .filter(Boolean)
                .map((word) => ({
                  $or: [
                    { name_ru: { $containsi: word } },
                    { name_kk: { $containsi: word } },
                  ],
                })),
            };

        const parsed = parseCompanyFilters(ctx.query);
        const sortKey = sortOf(ctx);
        const conditions = [textFilter, ...toDocumentFilters(parsed)];
        if (byDate(sortKey)) {
          conditions.push({ registration_date: { $notNull: true } });
        }
        const filters: any = { $and: conditions };

        const [items, count] = await Promise.all([
          strapi.documents("api::company.company").findMany({
            filters,
            fields: PUBLIC_FIELDS,
            sort: sortKey
              ? SORTS[sortKey]
              : byBin
                ? "bin:asc"
                : "sort_name:asc",
            start: (page - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
          }),
          countCapped(parsed, q, byDate(sortKey)),
        ]);

        ctx.body = {
          data: items.map(strip),
          meta: {
            page,
            pageSize: PAGE_SIZE,
            maxPage: MAX_PAGE,
            total: count.total,
            totalCapped: count.capped,
          },
        };
      },

      async list(ctx: any) {
        const page = pageOf(ctx);
        if (page > MAX_PAGE) {
          return ctx.badRequest("Слишком далёкая страница");
        }

        const parsed = parseCompanyFilters(ctx.query);
        const sortKey = sortOf(ctx);
        const conditions = toDocumentFilters(parsed);
        if (byDate(sortKey)) {
          conditions.push({ registration_date: { $notNull: true } });
        }
        const filters: any = conditions.length > 0 ? { $and: conditions } : {};

        const [items, count] = await Promise.all([
          strapi.documents("api::company.company").findMany({
            filters,
            fields: PUBLIC_FIELDS,
            sort: SORTS[sortKey || "name_asc"],
            start: (page - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
          }),
          countCapped(parsed, "", byDate(sortKey)),
        ]);

        ctx.body = {
          data: items.map(strip),
          meta: {
            page,
            pageSize: PAGE_SIZE,
            maxPage: MAX_PAGE,
            total: count.total,
            totalCapped: count.capped,
          },
        };
      },

      async filters(ctx: any) {
        if (!filtersCache || Date.now() - filtersCache.at > FILTERS_TTL) {
          const [legalForms, krp, kse, kfs, oked] = await Promise.all([
            raw(
              `SELECT legal_form AS code, count(*)::int AS count
                 FROM companies
                                WHERE legal_form IS NOT NULL
                  AND status IS DISTINCT FROM 'gone'
                GROUP BY legal_form
                ORDER BY count(*) DESC`,
            ),
            dictionary("krp"),
            dictionary("kse"),
            dictionary("kfs"),
            dictionary("oked"),
          ]);
          filtersCache = {
            at: Date.now(),
            data: { legalForms, krp, kse, kfs, oked },
          };
        }

        ctx.set("Cache-Control", "public, max-age=3600");
        ctx.body = { data: filtersCache.data };
      },

      async catalogIndex(ctx: any) {
        if (!catalogCache || Date.now() - catalogCache.at > CATALOG_TTL) {
          const [letters, forms] = await Promise.all([
            raw(
              `SELECT ${LETTER_SQL} AS letter, count(*)::int AS count
                 FROM companies
                WHERE sort_name IS NOT NULL AND sort_name <> ''
                GROUP BY 1`,
            ),
            raw(
              `SELECT legal_form AS code, count(*)::int AS count
                 FROM companies
                WHERE legal_form IS NOT NULL
                GROUP BY 1
                ORDER BY 2 DESC`,
            ),
          ]);
          catalogCache = { at: Date.now(), data: { letters, forms } };
        }

        ctx.set("Cache-Control", "public, max-age=3600");
        ctx.body = { data: catalogCache.data };
      },

      async catalogList(ctx: any) {
        const letter = String(ctx.query.letter || "")
          .toUpperCase()
          .slice(0, 1);
        const form = String(ctx.query.form || "");
        const page = pageOf(ctx);

        let where = "";
        let value = "";
        if (letter && LETTER_PATTERN.test(letter)) {
          where = `${LETTER_SQL} = ?`;
          value = letter;
        } else if (form && LEGAL_FORMS.includes(form)) {
          where = "legal_form = ?";
          value = form;
        } else {
          return ctx.badRequest("Не указана буква или категория");
        }

        const counted = await strapi.db.connection.raw(
          `SELECT count(*)::int AS total FROM companies WHERE ${where}`,
          [value],
        );
        const total = counted.rows[0].total;
        const pages = Math.max(Math.ceil(total / CATALOG_PAGE_SIZE), 1);
        if (page > pages) return ctx.notFound("Страница не найдена");

        const list = await strapi.db.connection.raw(
          `SELECT bin, slug, name_ru, name_kk, locality_ru, locality_kk, status
             FROM companies
            WHERE ${where}
            ORDER BY sort_name, bin
            LIMIT ? OFFSET ?`,
          [value, CATALOG_PAGE_SIZE, (page - 1) * CATALOG_PAGE_SIZE],
        );

        ctx.set("Cache-Control", "public, max-age=3600");
        ctx.body = {
          data: list.rows,
          meta: { page, pages, total, pageSize: CATALOG_PAGE_SIZE },
        };
      },

      async card(ctx: any) {
        const code = codeOf(String(ctx.params.slug || ""));
        if (!code) {
          return ctx.notFound("Компания не найдена");
        }

        const isMember = !RESTRICT_GUESTS || Boolean(ctx.state.user);

        const items = await strapi.documents("api::company.company").findMany({
          filters: { slug_code: { $eq: code } },
          fields: isMember ? MEMBER_FIELDS : PUBLIC_FIELDS,
          limit: 1,
        });

        if (items.length === 0) {
          return ctx.notFound("Компания не найдена");
        }

        ctx.body = {
          data: strip(items[0]),
          access: isMember ? "member" : "guest",
        };
      },

      async dashboard(ctx: any) {
        const code = codeOf(String(ctx.params.code || ""));
        if (!code) return ctx.notFound("Компания не найдена");
        const db = strapi.db.connection;

        const found = await db.raw(
          `SELECT bin, kato, oked_code, krp_code, status,
                  registration_date::text AS registration_date,
                  last_seen::text AS last_seen,
                  date_part('year', age(
                    CASE WHEN status = 'gone' AND last_seen IS NOT NULL
                         THEN last_seen ELSE current_date END,
                    registration_date))::int AS age_years
             FROM companies
            WHERE slug_code = ?
            LIMIT 1`,
          [code],
        );
        const company = found.rows[0];
        if (!company) return ctx.notFound("Компания не найдена");

        const latestRow = await db.raw(
          "SELECT max(taken_on)::text AS taken_on FROM snapshots WHERE NOT is_test",
        );
        const latestOn = latestRow.rows[0]?.taken_on || "";

        const periods = (
          await db.raw(
            `SELECT from_on::text AS from_on, to_on::text AS to_on,
                    name_id, director_id, address_id, oked_code
               FROM company_periods
              WHERE bin = ?
              ORDER BY from_on`,
            [company.bin],
          )
        ).rows;

        const changes = { director: 0, address: 0, name: 0, oked: 0 };
        for (let i = 1; i < periods.length; i += 1) {
          const prev = periods[i - 1];
          const next = periods[i];
          if (prev.director_id !== next.director_id) changes.director += 1;
          if (prev.address_id !== next.address_id) changes.address += 1;
          if (prev.name_id !== next.name_id) changes.name += 1;
          if (prev.oked_code !== next.oked_code) changes.oked += 1;
        }

        const last = periods[periods.length - 1];
        const active = Boolean(last && latestOn && last.to_on === latestOn);

        let neighbors: any = null;
        if (active && last.address_id) {
          const counted = await db.raw(
            `SELECT count(DISTINCT bin)::int AS count
               FROM company_periods
              WHERE address_id = ? AND to_on = ?::date AND bin <> ?`,
            [last.address_id, latestOn, company.bin],
          );
          neighbors = { id: last.address_id, count: counted.rows[0].count };
        }

        let director: any = null;
        if (active && last.director_id) {
          const counted = await db.raw(
            `SELECT count(DISTINCT bin)::int AS count
               FROM company_periods
              WHERE director_id = ? AND to_on = ?::date AND bin <> ?`,
            [last.director_id, latestOn, company.bin],
          );
          director = { id: last.director_id, count: counted.rows[0].count };
        }

        let peers: any = null;
        if (active && company.oked_code && /^\d{9}$/.test(company.kato || "")) {
          const region = company.kato.slice(0, 2);
          const krp = /^\d+$/.test(company.krp_code || "")
            ? Number(company.krp_code)
            : null;
          const counted = await db.raw(
            `SELECT count(*)::int AS total,
                    count(*) FILTER (WHERE registration_date > ?::date)::int AS younger,
                    count(*) FILTER (WHERE krp_code ~ '^[0-9]+$')::int AS sized,
                    count(*) FILTER (
                      WHERE CASE WHEN krp_code ~ '^[0-9]+$'
                                 THEN krp_code::int < ? ELSE false END
                    )::int AS smaller
               FROM companies
              WHERE oked_code = ?
                AND kato LIKE ?
                AND status IS DISTINCT FROM 'gone'
                AND bin <> ?`,
            [
              company.registration_date || "1900-01-01",
              krp ?? 0,
              company.oked_code,
              `${region}%`,
              company.bin,
            ],
          );
          const names = await db.raw(
            "SELECT name_ru, name_kk FROM territories WHERE level = 1 AND kato = ? LIMIT 1",
            [`${region}0000000`],
          );
          const row = counted.rows[0];
          peers = {
            oked: company.oked_code,
            region,
            regionRu: names.rows[0]?.name_ru || "",
            regionKk: names.rows[0]?.name_kk || "",
            total: row.total,
            olderThan:
              company.registration_date && row.total > 0
                ? Math.round((row.younger * 100) / row.total)
                : null,
            largerThan:
              krp !== null && row.sized > 0
                ? Math.round((row.smaller * 100) / row.sized)
                : null,
          };
        }

        ctx.set("Cache-Control", "public, max-age=3600");
        ctx.body = {
          data: {
            registrationDate: company.registration_date,
            ageYears: company.age_years,
            lastSeen: company.last_seen,
            active,
            changes,
            neighbors,
            director,
            peers,
          },
        };
      },

      async seoPage(ctx: any) {
        const locale = String(ctx.params.locale || "");
        if (!["ru", "kk"].includes(locale)) return ctx.notFound();

        let html: string;
        try {
          html = readIndex();
        } catch {
          return ctx.internalServerError("Не найден собранный index.html");
        }

        const slug = String(ctx.params.slug || "");
        const code = codeOf(slug);
        const found = code
          ? (
              await strapi.db.connection.raw(
                `SELECT bin, slug, slug_code, name_ru, name_kk, legal_form, status,
                        last_seen::text AS last_seen,
                        registration_date::text AS registration_date,
                        oked_name_ru, oked_name_kk, locality_ru, locality_kk,
                        director_name
                   FROM companies
                  WHERE slug_code = ?
                  LIMIT 1`,
                [code],
              )
            ).rows
          : [];
        const company = found[0];

        ctx.type = "text/html; charset=utf-8";

        if (!company) {
          ctx.status = 404;
          ctx.body = injectHead(html, notFoundHead(), locale);
          return;
        }

        if (company.slug !== slug) {
          ctx.redirect(`/${locale}/company/${company.slug}`);
          ctx.status = 301;
          return;
        }

        const base = siteUrl();
        const apiUrl = (process.env.PUBLIC_API_URL || `${base}/api`).replace(
          /\/$/,
          "",
        );

        ctx.set("Cache-Control", "public, max-age=600");
        ctx.body = injectHead(
          html,
          companyHead({ company, locale, siteUrl: base, apiUrl }),
          locale,
        );
      },

      async ogImage(ctx: any) {
        const code = codeOf(String(ctx.params.code || ""));
        if (!code) return ctx.notFound("Компания не найдена");

        const found = await strapi.db.connection.raw(
          `SELECT bin, name_ru, legal_form, kfs_code, status,
                  last_seen::text AS last_seen,
                                    registration_date::text AS registration_date, locality_ru, krp_name_ru
             FROM companies
            WHERE slug_code = ?
            LIMIT 1`,
          [code],
        );
        const company = found.rows[0];
        if (!company) return ctx.notFound("Компания не найдена");

        const dir = path.join(process.cwd(), ".cache", "og");
        const file = path.join(
          dir,
          `v2-${code}-${company.last_seen || "x"}-${company.status || "x"}.png`,
        );

        let png: Buffer;
        if (fs.existsSync(file)) {
          png = fs.readFileSync(file);
        } else {
          const periods = await strapi.db.connection.raw(
            `SELECT from_on::text AS from_on, to_on::text AS to_on, name_id,
                    director_id, address_id, oked_code, krp_code
               FROM company_periods
              WHERE bin = ?
              ORDER BY from_on`,
            [company.bin],
          );
          const latest = await strapi.db.connection.raw(
            "SELECT max(taken_on)::text AS taken_on FROM snapshots WHERE NOT is_test",
          );
          const changes = summarizeChanges(
            periods.rows,
            latest.rows[0]?.taken_on || "",
          );
          png = await renderCompanyCard(company, changes);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(file, png);
        }

        ctx.type = "image/png";
        ctx.set("Cache-Control", "public, max-age=86400");
        ctx.body = png;
      },

      async sitemapIndex(ctx: any) {
        const xml = await cached("index", async () => {
          const total = await strapi
            .documents("api::company.company")
            .count({});
          const chunks = Math.ceil(total / SITEMAP_CHUNK);
          const base = siteUrl();
          const files = [`${base}/sitemap-static.xml`];

          for (let i = 1; i <= chunks; i += 1) {
            files.push(`${base}/sitemap-companies-${i}.xml`);
          }

          const addressIds = await indexedAddressIds();
          const addressChunks = Math.ceil(addressIds.length / SITEMAP_CHUNK);
          for (let i = 1; i <= addressChunks; i += 1) {
            files.push(`${base}/sitemap-addresses-${i}.xml`);
          }

          return (
            XML_HEAD +
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            files
              .map(
                (file) => `  <sitemap><loc>${escapeXml(file)}</loc></sitemap>`,
              )
              .join("\n") +
            "\n</sitemapindex>\n"
          );
        });

        sendXml(ctx, xml);
      },

      async sitemapStatic(ctx: any) {
        const base = siteUrl();
        sendXml(
          ctx,
          urlset(
            ["/", "/companies", "/catalog", "/stats"].flatMap((path) =>
              pageEntries(base, path),
            ),
          ),
        );
      },

      async sitemapAddresses(ctx: any) {
        const page = parseInt(String(ctx.params.page || ""), 10);
        if (!Number.isInteger(page) || page < 1) {
          return ctx.notFound("Карта сайта не найдена");
        }

        const xml = await cached(`addresses-${page}`, async () => {
          const ids = (await indexedAddressIds()).slice(
            (page - 1) * SITEMAP_CHUNK,
            page * SITEMAP_CHUNK,
          );
          if (ids.length === 0) return "";
          const base = siteUrl();
          return urlset(
            ids.flatMap((id) => pageEntries(base, `/address/${id}`)),
          );
        });

        if (!xml) {
          return ctx.notFound("Карта сайта не найдена");
        }

        sendXml(ctx, xml);
      },

      async sitemapCompanies(ctx: any) {
        const page = parseInt(String(ctx.params.page || ""), 10);
        if (!Number.isInteger(page) || page < 1) {
          return ctx.notFound("Карта сайта не найдена");
        }

        const xml = await cached(`companies-${page}`, async () => {
          const items = await strapi
            .documents("api::company.company")
            .findMany({
              fields: SITEMAP_FIELDS,
              sort: "id:asc",
              start: (page - 1) * SITEMAP_CHUNK,
              limit: SITEMAP_CHUNK,
            });

          if (items.length === 0) return "";

          const base = siteUrl();
          return urlset(
            items
              .filter((item: any) => item.slug)
              .flatMap((item: any) =>
                pageEntries(
                  base,
                  `/company/${item.slug}`,
                  String(item.updatedAt || "").slice(0, 10),
                ),
              ),
          );
        });

        if (!xml) {
          return ctx.notFound("Карта сайта не найдена");
        }

        sendXml(ctx, xml);
      },
    };
  },
);
