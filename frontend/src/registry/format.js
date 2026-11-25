export const TYPES = ["osi", "ksk", "uk", "service"];

export const nameOf = (item, locale) =>
  (locale === "kk" && item?.name_kk) || item?.name_ru || "";

export const cityOf = (item, locale) =>
  (locale === "kk" && item?.city_kk) || item?.city_ru || "";

export const districtOf = (item, locale) =>
  (locale === "kk" && item?.district_kk) || item?.district_ru || "";

export const formatNumber = (value) =>
  typeof value === "number" ? value.toLocaleString("ru-RU") : "—";
