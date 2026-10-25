import { factories } from "@strapi/strapi";
import {
  parseCompanyFilters,
  toDocumentFilters,
} from "../../../utils/company-filters";

const RESTRICT_GUESTS = false;

const PUBLIC_FIELDS: any = [
  "bin",
  "slug",
  "legal_form",
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

const SITEMAP_FIELDS: any = ["slug"];

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

const urlset = (urls: string[]) =>
  XML_HEAD +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join("\n") +
  "\n</urlset>\n";

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
          GROUP BY ${column}_code
          ORDER BY ${column}_code`,
      );

    return {
      async search(ctx: any) {
        const q = String(ctx.query.q || "").trim();
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
              $or: [
                { name_ru: { $containsi: q } },
                { name_kk: { $containsi: q } },
              ],
            };

        const filters: any = {
          $and: [
            textFilter,
            ...toDocumentFilters(parseCompanyFilters(ctx.query)),
          ],
        };

        const [items, total] = await Promise.all([
          strapi.documents("api::company.company").findMany({
            filters,
            fields: PUBLIC_FIELDS,
            sort: byBin ? "bin:asc" : "sort_name:asc",
            start: (page - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
          }),
          strapi.documents("api::company.company").count({ filters }),
        ]);

        ctx.body = {
          data: items.map(strip),
          meta: { page, pageSize: PAGE_SIZE, maxPage: MAX_PAGE, total },
        };
      },

      async list(ctx: any) {
        const page = pageOf(ctx);
        if (page > MAX_PAGE) {
          return ctx.badRequest("Слишком далёкая страница");
        }

        const conditions = toDocumentFilters(parseCompanyFilters(ctx.query));
        const filters: any = conditions.length > 0 ? { $and: conditions } : {};

        const [items, total] = await Promise.all([
          strapi.documents("api::company.company").findMany({
            filters,
            fields: PUBLIC_FIELDS,
            sort: "sort_name:asc",
            start: (page - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
          }),
          strapi.documents("api::company.company").count({ filters }),
        ]);

        ctx.body = {
          data: items.map(strip),
          meta: { page, pageSize: PAGE_SIZE, maxPage: MAX_PAGE, total },
        };
      },

      async filters(ctx: any) {
        if (!filtersCache || Date.now() - filtersCache.at > FILTERS_TTL) {
          const [legalForms, krp, kse, kfs, oked] = await Promise.all([
            raw(
              `SELECT legal_form AS code, count(*)::int AS count
                 FROM companies
                WHERE legal_form IS NOT NULL
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
        sendXml(ctx, urlset([`${base}/`, `${base}/companies`]));
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
              .map((item: any) => `${base}/company/${item.slug}`),
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
