export const LEGAL_FORMS = [
  "too",
  "ao",
  "osi",
  "ksk",
  "coop",
  "partnership",
  "gov_institution",
  "gov_enterprise",
  "association",
  "fund",
  "institution",
  "aifc",
  "branch",
  "other",
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const digits = (value: unknown, max: number) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, max);

export type CompanyFilters = {
  prefix: string;
  form: string;
  oked: string;
  krp: string;
  kse: string;
  kfs: string;
  registeredFrom: string;
  registeredTo: string;
};

export const parseCompanyFilters = (query: any): CompanyFilters => {
  const district = digits(query.district, 4);
  const region = digits(query.region, 2);
  const form = String(query.form || "");
  const registeredFrom = String(query.registered_from || "");
  const registeredTo = String(query.registered_to || "");

  return {
    prefix:
      district.length === 4 ? district : region.length === 2 ? region : "",
    form: LEGAL_FORMS.includes(form) ? form : "",
    oked: digits(query.oked, 5),
    krp: digits(query.krp, 4),
    kse: digits(query.kse, 4),
    kfs: digits(query.kfs, 4),
    registeredFrom: DATE.test(registeredFrom) ? registeredFrom : "",
    registeredTo: DATE.test(registeredTo) ? registeredTo : "",
  };
};

export const toDocumentFilters = (filters: CompanyFilters) => {
  const list: any[] = [];
  if (filters.prefix) list.push({ kato: { $startsWith: filters.prefix } });
  if (filters.form) list.push({ legal_form: { $eq: filters.form } });
  if (filters.oked) list.push({ oked_code: { $startsWith: filters.oked } });
  if (filters.krp) list.push({ krp_code: { $eq: filters.krp } });
  if (filters.kse) list.push({ kse_code: { $eq: filters.kse } });
  if (filters.kfs) list.push({ kfs_code: { $eq: filters.kfs } });
  if (filters.registeredFrom) {
    list.push({ registration_date: { $gte: filters.registeredFrom } });
  }
  if (filters.registeredTo) {
    list.push({ registration_date: { $lte: filters.registeredTo } });
  }
  return list;
};

export const toSqlConditions = (filters: CompanyFilters, alias: string) => {
  const parts: string[] = [];
  const bindings: any[] = [];

  if (filters.form) {
    parts.push(`${alias}.legal_form = ?`);
    bindings.push(filters.form);
  }
  if (filters.oked) {
    parts.push(`${alias}.oked_code LIKE ?`);
    bindings.push(`${filters.oked}%`);
  }
  for (const [column, value] of [
    ["krp_code", filters.krp],
    ["kse_code", filters.kse],
    ["kfs_code", filters.kfs],
  ]) {
    if (value) {
      parts.push(`${alias}.${column} = ?`);
      bindings.push(value);
    }
  }
  if (filters.registeredFrom) {
    parts.push(`${alias}.registration_date >= ?::date`);
    bindings.push(filters.registeredFrom);
  }
  if (filters.registeredTo) {
    parts.push(`${alias}.registration_date <= ?::date`);
    bindings.push(filters.registeredTo);
  }

  return { sql: parts.join(" AND "), bindings };
};
