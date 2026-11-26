import type { Core } from "@strapi/strapi";

const PAGE_SIZE = 20;
const TYPES = ["osi", "ksk", "uk", "service"];

const fail = (ctx: any, status: number, code: string) => {
  ctx.status = status;
  ctx.body = { data: null, error: { status, name: code, message: code } };
};

const pageOf = (value: unknown) =>
  Math.max(1, parseInt(String(value || "1"), 10) || 1);

const CITY_BY_KATO = `
  zhkh_city((select t.id from territories t where t.kato = c.kato order by t.level desc limit 1), 'ru') as city_ru,
  zhkh_city((select t.id from territories t where t.kato = c.kato order by t.level desc limit 1), 'kk') as city_kk`;

const CURRENT_COUNTS = `
  select cl.company_id,
         count(*) filter (where m.ended_at is null)::int as current,
         count(*) filter (where m.ended_at is not null)::int as past
  from house_managements m
  join house_managements_company_lnk cl on cl.house_management_id = m.id
  group by cl.company_id`;

const CURRENT_MANAGER = `
  (select json_build_object(
            'bin', c.bin, 'slug', c.slug, 'name_ru', c.name_ru, 'name_kk', c.name_kk,
            'zhkh_type', c.zhkh_type, 'role', m.role)
   from house_managements m
   join house_managements_house_lnk hl2 on hl2.house_management_id = m.id
   join house_managements_company_lnk cl on cl.house_management_id = m.id
   join companies c on c.id = cl.company_id
   where hl2.house_id = h.id and m.ended_at is null
   order by m.started_at desc
   limit 1) as manager`;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const rows = async (sql: string, params: any[] = []) => {
    const result: any = await strapi.db.connection.raw(sql, params);
    return result.rows as any[];
  };

  return {
    async companies(ctx: any) {
      const type = TYPES.includes(ctx.query.type) ? ctx.query.type : null;
      const status = ["active", "gone", "all"].includes(ctx.query.status)
        ? ctx.query.status
        : "active";
      const housesFilter = ["yes", "no"].includes(ctx.query.houses)
        ? ctx.query.houses
        : "";
      const city = String(ctx.query.city || "").trim();
      const sort = ctx.query.sort === "name" ? "name" : "houses";
      const q = String(ctx.query.q || "").trim();
      const page = pageOf(ctx.query.page);
      const where = ["c.zhkh_registry = true"];
      const params: any[] = [];
      if (status === "active") where.push("c.status = 'active'");
      if (status === "gone") where.push("coalesce(c.status, '') <> 'active'");
      if (type) {
        where.push("c.zhkh_type = ?");
        params.push(type);
      }
      if (q) {
        if (/^\d{3,12}$/.test(q)) {
          where.push("c.bin like ?");
          params.push(`${q}%`);
        } else {
          where.push("(c.name_ru ilike ? or c.name_kk ilike ?)");
          params.push(`%${q}%`, `%${q}%`);
        }
      }
      if (housesFilter === "yes") where.push("coalesce(n.current, 0) > 0");
      if (housesFilter === "no") where.push("coalesce(n.current, 0) = 0");
      if (city) {
        where.push(`exists (
          select 1
          from house_managements_company_lnk cc
          join house_managements mc on mc.id = cc.house_management_id and mc.ended_at is null
          join house_managements_house_lnk hc on hc.house_management_id = mc.id
          join houses hh on hh.id = hc.house_id
          where cc.company_id = c.id and hh.city = ?)`);
        params.push(city);
      }
      const whereSql = where.join(" and ");
      const fromSql = `from companies c left join (${CURRENT_COUNTS}) n on n.company_id = c.id`;
      const orderSql =
        sort === "name"
          ? "coalesce(c.sort_name, c.name_ru)"
          : "coalesce(n.current, 0) desc, coalesce(c.sort_name, c.name_ru)";
      const [{ total }] = await rows(
        `select count(*)::int as total ${fromSql} where ${whereSql}`,
        params,
      );
      const items = await rows(
        `select c.bin, c.slug, c.name_ru, c.name_kk, c.zhkh_type, c.status,
                ${CITY_BY_KATO},
                coalesce(n.current, 0) as houses_current,
                coalesce(n.past, 0) as houses_past
         ${fromSql}
         where ${whereSql}
         order by ${orderSql}
         limit ? offset ?`,
        [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE],
      );
      const cities = await rows(
        `select hh.city, count(distinct cc.company_id)::int as count
         from house_managements_company_lnk cc
         join house_managements mc on mc.id = cc.house_management_id and mc.ended_at is null
         join house_managements_house_lnk hc on hc.house_management_id = mc.id
         join houses hh on hh.id = hc.house_id
         join companies c2 on c2.id = cc.company_id and c2.zhkh_registry = true
         where coalesce(hh.city, '') <> ''
         group by hh.city
         order by count(distinct cc.company_id) desc, hh.city`,
      );
      ctx.body = { items, total, page, pageSize: PAGE_SIZE, cities };
    },

    async company(ctx: any) {
      const slug = String(ctx.params.slug || "");
      const [company] = await rows(
        `select c.id, c.bin, c.slug, c.name_ru, c.name_kk, c.zhkh_type, c.status, c.legal_form,
                to_char(c.registration_date, 'YYYY-MM-DD') as registration_date,
                c.legal_address, c.director_name, c.oked_code, c.oked_name_ru, c.oked_name_kk,
                ${CITY_BY_KATO}
         from companies c
         where c.slug = ? and c.zhkh_registry = true
         limit 1`,
        [slug],
      );
      if (!company) return fail(ctx, 404, "NOT_FOUND");

      const houses = await rows(
        `select h.address_id, h.address, h.apartments, m.role, m.service_kind,
                to_char(m.started_at, 'YYYY-MM-DD') as started_at,
                to_char(m.ended_at, 'YYYY-MM-DD') as ended_at,
                zhkh_city(t.id, 'ru') as city_ru, zhkh_city(t.id, 'kk') as city_kk, zhkh_place(t.id, 'ru', 'district') as district_ru, zhkh_place(t.id, 'kk', 'district') as district_kk,
                cx.name as complex_name, cx.slug as complex_slug
         from house_managements m
         join house_managements_company_lnk cl on cl.house_management_id = m.id
         join house_managements_house_lnk hl on hl.house_management_id = m.id
         join houses h on h.id = hl.house_id
         left join addresses a on a.id = h.address_id
         left join territories t on t.id = a.territory_id
         left join houses_complex_lnk xl on xl.house_id = h.id
         left join complexes cx on cx.id = xl.complex_id
         where cl.company_id = ?
         order by (m.ended_at is null) desc, m.ended_at desc, h.address`,
        [company.id],
      );

      const { id, ...data } = company;
      ctx.body = {
        company: data,
        houses,
        stats: {
          current: houses.filter((x) => !x.ended_at).length,
          past: houses.filter((x) => x.ended_at).length,
        },
      };
    },

    async houses(ctx: any) {
      const q = String(ctx.query.q || "").trim();
      const city = String(ctx.query.city || "").trim();
      const managed = ["yes", "no"].includes(ctx.query.managed)
        ? ctx.query.managed
        : "";
      const inComplex = ctx.query.complex === "1";
      const page = pageOf(ctx.query.page);
      const where: string[] = [];
      const params: any[] = [];
      const hasManager = `exists (
        select 1
        from house_managements_house_lnk hm
        join house_managements mm on mm.id = hm.house_management_id and mm.ended_at is null
        where hm.house_id = h.id)`;
      if (q) {
        where.push("h.address ilike ?");
        params.push(`%${q}%`);
      }
      if (city) {
        where.push("h.city = ?");
        params.push(city);
      }
      if (managed === "yes") where.push(hasManager);
      if (managed === "no") where.push(`not ${hasManager}`);
      if (inComplex) {
        where.push(
          "exists (select 1 from houses_complex_lnk xc where xc.house_id = h.id)",
        );
      }
      const whereSql = where.length ? `where ${where.join(" and ")}` : "";
      const [{ total }] = await rows(
        `select count(*)::int as total from houses h ${whereSql}`,
        params,
      );
      const items = await rows(
        `select h.address_id, h.address, h.apartments,
                ${"zhkh_city(t.id, 'ru') as city_ru, zhkh_city(t.id, 'kk') as city_kk, zhkh_place(t.id, 'ru', 'district') as district_ru, zhkh_place(t.id, 'kk', 'district') as district_kk"},
                cx.name as complex_name, cx.slug as complex_slug,
                ${CURRENT_MANAGER}
         from houses h
         left join addresses a on a.id = h.address_id
         left join territories t on t.id = a.territory_id
         left join houses_complex_lnk xl on xl.house_id = h.id
         left join complexes cx on cx.id = xl.complex_id
         ${whereSql}
         order by h.address
         limit ? offset ?`,
        [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE],
      );
      const cities = await rows(
        `select city, count(*)::int as count
         from houses
         where coalesce(city, '') <> ''
         group by city
         order by count(*) desc, city`,
      );
      ctx.body = { items, total, page, pageSize: PAGE_SIZE, cities };
    },

    async house(ctx: any) {
      const addressId = parseInt(String(ctx.params.id || ""), 10);
      if (!addressId) return fail(ctx, 404, "NOT_FOUND");
      const [house] = await rows(
        `select h.id, h.address_id, h.address, h.apartments, h.floors, h.year_built,
                h.latitude, h.longitude,
                zhkh_city(t.id, 'ru') as city_ru, zhkh_city(t.id, 'kk') as city_kk, zhkh_place(t.id, 'ru', 'district') as district_ru, zhkh_place(t.id, 'kk', 'district') as district_kk, t.path_ru, t.path_kk,
                cx.name as complex_name, cx.slug as complex_slug,
                (select count(*)::int from units u where u.address_id = h.address_id) as units
         from houses h
         left join addresses a on a.id = h.address_id
         left join territories t on t.id = a.territory_id
         left join houses_complex_lnk xl on xl.house_id = h.id
         left join complexes cx on cx.id = xl.complex_id
         where h.address_id = ?
         limit 1`,
        [addressId],
      );
      if (!house) return fail(ctx, 404, "NOT_FOUND");

      const managements = await rows(
        `select c.bin, c.slug, c.name_ru, c.name_kk, c.zhkh_type, c.status,
                m.role, m.service_kind,
                to_char(m.started_at, 'YYYY-MM-DD') as started_at,
                to_char(m.ended_at, 'YYYY-MM-DD') as ended_at
         from house_managements m
         join house_managements_house_lnk hl on hl.house_management_id = m.id
         join house_managements_company_lnk cl on cl.house_management_id = m.id
         join companies c on c.id = cl.company_id
         where hl.house_id = ?
         order by (m.ended_at is null) desc, m.ended_at desc, m.started_at desc`,
        [house.id],
      );

      const { id, ...data } = house;
      ctx.body = { house: data, managements };
    },

    async complexes(ctx: any) {
      const q = String(ctx.query.q || "").trim();
      const city = String(ctx.query.city || "").trim();
      const multi = ctx.query.multi === "1";
      const page = pageOf(ctx.query.page);
      const where: string[] = [];
      const params: any[] = [];
      if (q) {
        where.push("(cx.name ilike ? or cx.city ilike ?)");
        params.push(`%${q}%`, `%${q}%`);
      }
      if (city) {
        where.push("cx.city = ?");
        params.push(city);
      }
      const whereSql = where.length ? `where ${where.join(" and ")}` : "";
      const havingSql = multi ? "having count(xl.house_id) >= 2" : "";
      const base = `
        select cx.name, cx.slug, cx.city, cx.apartments,
               count(xl.house_id)::int as houses
        from complexes cx
        left join houses_complex_lnk xl on xl.complex_id = cx.id
        ${whereSql}
        group by cx.id
        ${havingSql}`;
      const [{ total }] = await rows(
        `select count(*)::int as total from (${base}) b`,
        params,
      );
      const items = await rows(
        `select * from (${base}) b
         order by b.houses desc, b.name
         limit ? offset ?`,
        [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE],
      );
      const cities = await rows(
        `select cx.city, count(*)::int as count
         from complexes cx
         where coalesce(cx.city, '') <> ''
         group by cx.city
         order by count(*) desc, cx.city`,
      );
      ctx.body = { items, total, page, pageSize: PAGE_SIZE, cities };
    },
    async complex(ctx: any) {
      const slug = String(ctx.params.slug || "");
      const [complex] = await rows(
        `select cx.id, cx.name, cx.slug, cx.city, cx.description, cx.apartments,
                cx.latitude, cx.longitude
         from complexes cx
         where cx.slug = ?
         limit 1`,
        [slug],
      );
      if (!complex) return fail(ctx, 404, "NOT_FOUND");

      const houses = await rows(
        `select h.address_id, h.address, h.apartments, h.latitude, h.longitude,
                zhkh_city(t.id, 'ru') as city_ru, zhkh_city(t.id, 'kk') as city_kk, zhkh_place(t.id, 'ru', 'district') as district_ru, zhkh_place(t.id, 'kk', 'district') as district_kk,
                ${CURRENT_MANAGER}
         from houses_complex_lnk xl
         join houses h on h.id = xl.house_id
         left join addresses a on a.id = h.address_id
         left join territories t on t.id = a.territory_id
         where xl.complex_id = ?
         order by h.address`,
        [complex.id],
      );

      const { id, ...data } = complex;
      ctx.body = { complex: data, houses };
    },
  };
};
