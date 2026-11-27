export const TYPES = ["osi", "ksk", "uk", "service"];

export const fullNameOf = (item, locale) =>
  (locale === "kk" && item?.name_kk) || item?.name_ru || "";

const NAME_NOISE = [
  /^ТОВАРИЩЕСТВО\s+С\s+ОГРАНИЧЕННОЙ\s+ОТВЕТСТВЕННОСТЬЮ\s*/i,
  /^АКЦИОНЕРНОЕ\s+ОБЩЕСТВО\s*/i,
  /^ОБЩЕСТВЕНН(ЫЙ|ОЕ)\s+(ФОНД|ОБЪЕДИНЕНИЕ)(\s+ИНВАЛИДОВ)?\s*/i,
  /^ОБЪЕДИНЕНИЕ\s+ЮРИДИЧЕСКИХ\s+ЛИЦ\s*/i,
  /^(ЧАСТНОЕ\s+)?УЧРЕЖДЕНИЕ\s*/i,
  /^АДВОКАТСКАЯ\s+КОНТОРА\s*/i,
  /^ЖАУАПКЕРШІЛІГІ\s+ШЕКТЕУЛІ\s+СЕРІКТЕСТІГІ\s*/i,
  /\s*ЖАУАПКЕРШІЛІГІ\s+ШЕКТЕУЛІ\s+СЕРІКТЕСТІГІ$/i,
  /^(ТОО|АО|ЖШС|АҚ)\s+/i,
  /^(ПОТРЕБИТЕЛЬСКИЙ\s+)?КООПЕРАТИВ\s+СОБСТВЕННИКОВ\s+(КВАРТИР|ПОМЕЩЕНИЙ)(\s*\([^)]*\))?\s*/i,
  /^ОБЪЕДИНЕНИЕ\s+СОБСТВЕННИКОВ\s+ИМУЩЕСТВА\s*/i,
  /\s*ОБЪЕДИНЕНИ[ЕЯ]\s+СОБСТВЕННИКОВ\s+ИМУЩЕСТВА$/i,
  /\s*МҮЛІК(ТІҢ)?\s+МЕНШІК\s+ИЕЛЕРІ(НІҢ)?\s+БІРЛЕСТІГІ$/i,
  /\s*ПӘТЕРЛЕР.*КООПЕРАТИВІ$/i,
  /^(ОСИ|КСК|КСП)\s+/i,
  /\s+(ОСИ|ҮЖК)$/i,
];

export const nameOf = (item, locale) => {
  const full = fullNameOf(item, locale);
  let short = full.trim().replace(/^["«\s]+/, "");
  for (const re of NAME_NOISE) short = short.replace(re, "");
  short = short.replace(/^["«\s]+|["»\s]+$/g, "").trim();
  return short || full;
};

const prettyPlace = (value) => {
  const text = String(value || "")
    .replace(/^(Г|П|С|А)\.\s*/i, "")
    .replace(/\s+(Қ\.|ҚАЛАСЫ)$/i, "")
    .trim();
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/(^|[\s-])(\S)/g, (_m, sep, ch) => sep + ch.toUpperCase());
};

export const cityOf = (item, locale) =>
  prettyPlace((locale === "kk" && item?.city_kk) || item?.city_ru);

export const districtOf = (item, locale) =>
  prettyPlace((locale === "kk" && item?.district_kk) || item?.district_ru);

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
