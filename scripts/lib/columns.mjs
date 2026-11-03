const LATIN = {
  a: "а",
  c: "с",
  e: "е",
  o: "о",
  p: "р",
  x: "х",
  k: "к",
  m: "м",
  h: "н",
  t: "т",
  b: "в",
  y: "у",
};

const textOf = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value.richText) return value.richText.map((part) => part.text).join("");
    if (value.text !== undefined) return String(value.text);
    if (value.result !== undefined) return String(value.result);
    return "";
  }
  return String(value);
};

const normalize = (value) =>
  textOf(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[aceopxkmhtby]/g, (ch) => LATIN[ch])
    .replace(/[\s.,]+/g, " ")
    .trim();

const FIELDS = [
  ["bin", (h) => h === "бин"],
  ["name_kk", (h) => h === "толық атауы"],
  ["name_ru", (h) => h === "полное наименование"],
  ["registration_date", (h) => h.includes("дата регистрации")],
  ["oked_code", (h) => h === "окэд"],
  ["oked_name_kk", (h) => h.startsWith("негізгі қызмет")],
  ["oked_name_ru", (h) => h.includes("основного вида")],
  ["secondary_oked", (h) => h.startsWith("втор")],
  ["krp_code", (h) => h === "крп"],
  ["krp_name_kk", (h) => h === "ккж атауы"],
  ["krp_name_ru", (h) => h === "наименование крп"],
  ["kse_code", (h) => h === "ксэ"],
  ["kse_name_kk", (h) => h === "эсж атауы"],
  ["kse_name_ru", (h) => h === "наименование ксэ"],
  ["kfs_code", (h) => h === "кфс"],
  ["kfs_name_kk", (h) => h === "мнж атауы"],
  ["kfs_name_ru", (h) => h === "наименование кфс"],
  ["kato", (h) => h === "като"],
  ["locality_kk", (h) => h.startsWith("елді мекен")],
  ["locality_ru", (h) => h.includes("населенного пункта")],
  ["legal_address", (h) => h.includes("юридический адрес")],
  ["director_name", (h) => h.includes("фио руководителя")],
];

export const REQUIRED = [
  "bin",
  "name_ru",
  "kato",
  "legal_address",
  "director_name",
];

export const detectColumns = (cells) => {
  const map = {};
  const unknown = [];

  (cells || []).forEach((cell, index) => {
    const header = normalize(cell);
    if (!header) return;
    const field = FIELDS.find(([, test]) => test(header));
    if (!field) {
      unknown.push(header);
      return;
    }
    if (!(field[0] in map)) map[field[0]] = index;
  });

  if (!("bin" in map)) return null;

  return {
    map,
    unknown,
    missing: REQUIRED.filter((field) => !(field in map)),
    hasCodes: "kse_code" in map && "kfs_code" in map,
  };
};

export const cellAt = (cells, map, field) =>
  field in map ? cells[map[field]] : undefined;
