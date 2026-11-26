export const TYPES = ["osi", "ksk", "uk", "service"];

export const nameOf = (item, locale) =>
  (locale === "kk" && item?.name_kk) || item?.name_ru || "";

export const cityOf = (item, locale) =>
  (locale === "kk" && item?.city_kk) || item?.city_ru || "";

export const districtOf = (item, locale) =>
  (locale === "kk" && item?.district_kk) || item?.district_ru || "";

export const formatNumber = (value) =>
  typeof value === "number" ? value.toLocaleString("ru-RU") : "—";

export const BINDEX_URL = "https://bindex.kz";

export const pluralKey = (n) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "one";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "few";
  return "many";
};

const monthYear = (value) =>
  value ? `${value.slice(5, 7)}.${value.slice(0, 4)}` : "";

export const formatDate = (value) =>
  value
    ? `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}`
    : "";

export const periodText = (item, t) => {
  const from = monthYear(item.started_at);
  const early = Boolean(item.started_at) && item.started_at <= "2018-01-01";
  if (!item.ended_at) {
    return t(early ? "registry.period.sinceEarly" : "registry.period.since", {
      date: from,
    });
  }
  return t("registry.period.range", {
    from: early ? `≤ ${from}` : from,
    to: monthYear(item.ended_at),
  });
};

export const placeOf = (item, locale) =>
  [cityOf(item, locale), districtOf(item, locale)].filter(Boolean).join(", ");
