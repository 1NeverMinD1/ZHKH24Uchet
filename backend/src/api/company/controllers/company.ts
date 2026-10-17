import { factories } from "@strapi/strapi";

const RESTRICT_GUESTS = false;

const PUBLIC_FIELDS: any = [
  "bin",
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

const BIN_ONLY: any = ["bin"];

const PAGE_SIZE = 20;
const SITEMAP_CHUNK = 10000;
const SITEMAP_TTL = 60 * 60 * 1000;
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n';

const siteUrl = () =>
  (process.env.SITE_URL || "http://localhost:5173").replace(/\/$/, "");

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
  ({ strapi }) => ({
    async search(ctx: any) {
      const q = String(ctx.query.q || "").trim();
      if (!q) {
        return ctx.badRequest("Пустой запрос");
      }

      const items = await strapi.documents("api::company.company").findMany({
        filters: {
          $or: [
            { name_ru: { $containsi: q } },
            { name_kk: { $containsi: q } },
            { bin: { $contains: q } },
          ],
        },
        fields: PUBLIC_FIELDS,
        limit: 20,
      });

      ctx.body = { data: items };
    },

    async list(ctx: any) {
      const page = Math.max(
        parseInt(String(ctx.query.page || "1"), 10) || 1,
        1,
      );

      const [items, total] = await Promise.all([
        strapi.documents("api::company.company").findMany({
          fields: PUBLIC_FIELDS,
          sort: "name_ru:asc",
          start: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        }),
        strapi.documents("api::company.company").count({}),
      ]);

      ctx.body = { data: items, meta: { page, pageSize: PAGE_SIZE, total } };
    },

    async card(ctx: any) {
      const bin = String(ctx.params.bin || "").trim();
      const isMember = !RESTRICT_GUESTS || Boolean(ctx.state.user);

      const items = await strapi.documents("api::company.company").findMany({
        filters: { bin: { $eq: bin } },
        fields: isMember ? MEMBER_FIELDS : PUBLIC_FIELDS,
        limit: 1,
      });

      if (items.length === 0) {
        return ctx.notFound("Компания не найдена");
      }

      ctx.body = {
        data: items[0],
        access: isMember ? "member" : "guest",
      };
    },

    async sitemapIndex(ctx: any) {
      const xml = await cached("index", async () => {
        const total = await strapi.documents("api::company.company").count({});
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
            .map((file) => `  <sitemap><loc>${escapeXml(file)}</loc></sitemap>`)
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
        const items = await strapi.documents("api::company.company").findMany({
          fields: BIN_ONLY,
          sort: "id:asc",
          start: (page - 1) * SITEMAP_CHUNK,
          limit: SITEMAP_CHUNK,
        });

        if (items.length === 0) return "";

        const base = siteUrl();
        return urlset(items.map((item: any) => `${base}/company/${item.bin}`));
      });

      if (!xml) {
        return ctx.notFound("Карта сайта не найдена");
      }

      sendXml(ctx, xml);
    },
  }),
);
