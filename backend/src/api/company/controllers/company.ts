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

const PAGE_SIZE = 20;

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
  }),
);
