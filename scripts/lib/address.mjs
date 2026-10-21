const LATIN_TO_CYR = {
  A: "А",
  B: "В",
  C: "С",
  E: "Е",
  H: "Н",
  K: "К",
  M: "М",
  O: "О",
  P: "Р",
  T: "Т",
  X: "Х",
  Y: "У",
};

const unify = (value) =>
  value
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .replace(/[ABCEHKMOPTXY]/g, (ch) => LATIN_TO_CYR[ch]);

const squash = (value) => value.replace(/\s+/g, " ").trim();

const TYPES = [
  [/^(?:УЛИЦА|УЛ)\.?(?=\s|$)/, "УЛИЦА"],
  [/^(?:ПРОСПЕКТ|ПР-Т|ПР-КТ|ПР)\.?(?=\s|$)/, "ПРОСПЕКТ"],
  [/^(?:ПЕРЕУЛОК|ПЕР)\.?(?=\s|$)/, "ПЕРЕУЛОК"],
  [/^(?:БУЛЬВАР|БУЛ|Б-Р)\.?(?=\s|$)/, "БУЛЬВАР"],
  [/^(?:ШОССЕ|ШОС)\.?(?=\s|$)/, "ШОССЕ"],
  [/^ПРОЕЗД(?=\s|$)/, "ПРОЕЗД"],
  [/^ТУПИК(?=\s|$)/, "ТУПИК"],
  [/^(?:ПЛОЩАДЬ|ПЛ)\.?(?=\s|$)/, "ПЛОЩАДЬ"],
  [/^НАБЕРЕЖНАЯ(?=\s|$)/, "НАБЕРЕЖНАЯ"],
  [/^АЛЛЕЯ(?=\s|$)/, "АЛЛЕЯ"],
  [/^(?:МИКРОРАЙОН|МКР|МКРН|МКР-Н)\.?(?=\s|$)/, "МИКРОРАЙОН"],
  [/^КВАРТАЛ(?=\s|$)/, "КВАРТАЛ"],
  [/^ЖИЛОЙ МАССИВ(?=\s|$)/, "ЖИЛОЙ МАССИВ"],
];

const NUMBERED_TYPES = new Set(["МИКРОРАЙОН", "КВАРТАЛ", "ЖИЛОЙ МАССИВ"]);

const HOUSE_PART =
  /^(?:дом|здание|строение|участок|земельный участок|дачный участок|д\.|зд\.|стр\.|уч\.)(?![\p{L}])\s*(?:№|N)?\s*(.+)$/iu;

const UNIT_START =
  /^(?:(?:кв|квартира|офис|оф|н\.\s?п|нп|помещение|пом|комната|каб|кабинет)(?![\p{L}])|\d+\s*этаж)/iu;

const BARE_HOUSE = /^\d+\s?[\p{L}]?(?:\s?[/\-]\s?\d+\s?[\p{L}]?)?$/u;

const KEYWORD_TAIL =
  /^(.*?)\s+(?:дом|д)\.?\s*(\d+\s?[\p{L}]?(?:\s?[/\-]\s?\d+\s?[\p{L}]?)?)$/iu;

const TRAILING_HOUSE = /^(.*?)\s+(\d+[\p{L}]?(?:\s?[/\-]\s?\d+[\p{L}]?)?)$/u;

const splitStreet = (street) => {
  const upper = unify(squash(street.replace(/["“”«»]/g, " ")));
  for (const [pattern, type] of TYPES) {
    const match = upper.match(pattern);
    if (match) {
      return { type, name: squash(upper.slice(match[0].length)) };
    }
  }
  return { type: "", name: upper };
};

const empty = { type: "", street: "", house: "", unit: "", text: "", key: "" };

export const parseAddress = (raw, kato) => {
  const source = squash(raw || "");
  if (!source) return empty;

  const parts = source.split(/\s*[,;]\s*/).filter(Boolean);

  let unitStart = parts.findIndex(
    (part, index) => index > 0 && UNIT_START.test(part),
  );
  if (unitStart < 0 && parts.length === 1 && UNIT_START.test(parts[0])) {
    unitStart = 0;
  }

  const buildingParts = parts.slice(
    0,
    unitStart >= 0 ? unitStart : parts.length,
  );
  const unit = unitStart >= 0 ? parts.slice(unitStart).join(", ") : "";

  let house = "";
  let streetParts = [...buildingParts];

  const houseIndex = buildingParts.findIndex((part) => HOUSE_PART.test(part));
  if (houseIndex >= 0) {
    house = unify(
      squash(buildingParts[houseIndex].match(HOUSE_PART)[1]),
    ).replace(/\s+/g, "");
    streetParts = buildingParts.slice(0, houseIndex);
  } else {
    const bareIndex = buildingParts.findIndex(
      (part, index) => index > 0 && BARE_HOUSE.test(part),
    );
    if (bareIndex >= 0) {
      house = unify(buildingParts[bareIndex]).replace(/\s+/g, "");
      streetParts = buildingParts.slice(0, bareIndex);
    } else {
      const last = streetParts[streetParts.length - 1] || "";
      const keyword = last.match(KEYWORD_TAIL);
      const trailing = keyword ? null : last.match(TRAILING_HOUSE);
      const match = keyword || trailing;
      if (match) {
        const head = streetParts.slice(0, -1).concat(match[1]).join(", ");
        const candidate = splitStreet(head);
        const numbered = NUMBERED_TYPES.has(candidate.type);
        if (
          candidate.name &&
          (keyword || !numbered || streetParts.length > 1)
        ) {
          streetParts[streetParts.length - 1] = match[1];
          house = unify(match[2]).replace(/\s+/g, "");
        }
      }
    }
  }

  const street = splitStreet(streetParts.join(", "));
  const text = buildingParts.join(", ");
  const whole = unify(squash(text));
  const key =
    street.name || street.type
      ? `${kato}|${street.type} ${street.name}|${house}`
      : whole
        ? `${kato}|${whole}`
        : "";

  return {
    type: street.type,
    street: street.name,
    house,
    unit,
    text,
    key: key.trim() === `${kato}|` ? "" : key,
  };
};
