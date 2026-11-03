const LATIN = {
  A: "А",
  B: "В",
  C: "С",
  E: "Е",
  H: "Н",
  I: "И",
  K: "К",
  M: "М",
  O: "О",
  P: "Р",
  T: "Т",
  X: "Х",
  Y: "У",
};

const KAZAKH = {
  Ә: "А",
  Ғ: "Г",
  Қ: "К",
  Ң: "Н",
  Ө: "О",
  Ұ: "У",
  Ү: "У",
  Һ: "Х",
  І: "И",
};

const upper = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .replace(/[ABCEHIKMOPTXY]/g, (ch) => LATIN[ch]);

const letters = (value) =>
  value
    .replace(/[ӘҒҚҢӨҰҮҺІ]/g, (ch) => KAZAKH[ch])
    .replace(/[^\p{L}\p{N}]+/gu, "");

export const isBroken = (value) =>
  /\uFFFD/.test(value || "") || /\p{L}\?|\?\p{L}/u.test(value || "");

const QUOTES = /[«»"“”„]/;

const KEY_FORMS = [
  ["branch", /^(ФИЛИАЛ|ПРЕДСТАВИТЕЛЬСТВО)( |$)/],
  [
    "ksk",
    /КООПЕРАТИВ\S* СОБСТВЕННИКОВ (КВАРТИР|ПОМЕЩЕНИЙ)|^(ПК )?КСК( |$)|^ПКСК( |$)/,
  ],
  [
    "partnership",
    /ТОВАРИЩЕСТВ\S* С ДОПОЛНИТЕЛЬНОЙ|^(ПОЛНОЕ|КОММАНДИТНОЕ) ТОВАРИЩЕСТВО|СЕЛЬСКОХОЗЯЙСТВЕННОЕ ТОВАРИЩЕСТВО|^(ТДО|КТ)( |$)/,
  ],
  ["too", /ТОВАРИЩЕСТВ.*(ОГ?Р\S*НИЧ|ОТВЕ\S*СТВЕННОСТ)|^ТОО( |$)/],
  [
    "aifc",
    /^(ЧАСТНАЯ|ПУБЛИЧНАЯ) КОМПАНИЯ|^КОМПАНИЯ СПЕЦИАЛЬНОГО НАЗНАЧЕНИЯ|^ЧК( |$)|^ПАРТНЕРСТВО С ОГРАНИЧЕННОЙ|^ОГРАНИЧЕННОЕ ПАРТНЕРСТВО|^НЕКОММЕРЧЕСКАЯ ОРГАНИЗАЦИЯ/,
  ],
  [
    "ao",
    /^((НЕКОММЕРЧЕСКОЕ|ЗАКРЫТОЕ|ОТКРЫТОЕ) )?АКЦИОНЕРНОЕ ОБЩЕСТВО|^(АО|НАО|ЗАО|ОАО)( |$)/,
  ],
  ["osi", /^ОБ[ЪЬ]?ЕД[ИЕ]Н\S* СОБСТВЕННИКОВ ИМУЩЕСТВА|^ОСИ( |$)/],
  ["coop", /КООПЕРАТИВ|^(ПК|СПК|СХПК|СПРК|ЖСК|ПГК|ПОК|ПРК)( |$)/],
  ["gov_enterprise", /ГОСУДА\S*.*ПРЕДП|^(ГКП|КГКП|ГККП|КГП|РГП|РГКП)( |$)/],
  ["gov_institution", /ГОСУДА\S*.*УЧЕ?РЕЖД|^(ГУ|КГУ|РГУ)( |$)/],
  [
    "association",
    /ОБ[ЪЬ]?ЕД[ИЕ]Н|АССОЦИАЦИ|СОЮЗ( |$)|ПАЛАТА( |$)|КОЛЛЕГИЯ( |$)|^(ОО|ООИ|ОЮЛ|РОО|МРО)( |$)/,
  ],
  ["fund", /ФОНД( |$)|(^| )(ОФ|ЧФ|КФ|БФ)( |$)/],
  ["institution", /УЧЕ?РЕЖД|^(ЧУ|У-Е)( |$)/],
];

const LEGAL_FORMS = [
  ["branch", /^(ФИЛИАЛ|ПРЕДСТАВИТЕЛЬСТВО)( |$)/],
  [
    "ksk",
    /КООПЕРАТИВ\S* СОБСТВЕННИКОВ (КВАРТИР|ПОМЕЩЕНИЙ)|^((ПК|ПОК) )?(КСК|ПКСК|ПОКСК|КСП)( |$)/,
  ],
  [
    "partnership",
    /ТОВАРИЩЕСТВ\S* С ДОПОЛНИТЕЛЬНОЙ|^(ПОЛНОЕ|КОММАНДИТНОЕ) ТОВАРИЩЕСТВ|СЕЛЬСКОХОЗЯЙСТВЕННОЕ ТОВАРИЩЕСТВО|^(ТДО|КТ|ПТ|ОДО)( |$)/,
  ],
  [
    "too",
    /ОВАРИ[ЩШ]ЕСТ?В.*(ОГ?Р\S*НИЧ|ОТВЕ\S*СТВЕННОСТ)|^(ТОО|ДТОО|СП ТОО|ЖШС|ТОВО|ТОJ|ТО0|ТО|NJJ)( |$)/,
  ],
  [
    "aifc",
    /^(ЧАСТНАЯ|ПУБЛИЧНАЯ) КОМПАНИЯ|^КОМПАНИЯ СПЕЦИАЛЬНОГО НАЗНАЧЕНИЯ|^ЧК( |$)|^ПАРТНЕРСТВО С ОГРАНИЧЕННОЙ|^ОГРАНИЧЕННОЕ ПАРТНЕРСТВО|^НЕКОММЕРЧЕСКАЯ ОРГАНИЗАЦИЯ/,
  ],
  [
    "ao",
    /^((НЕКОММЕРЧЕСКОЕ|ЗАКРЫТОЕ|ОТКРЫТОЕ) )?АКЦИОНЕРНОЕ ОБЩЕСТВО|^(АО|НАО|ЗАО|ОАО|АОЗТ)( |$)/,
  ],
  ["osi", /^ОБ[ЪЬ]?ЕД[ИЕ]Н\S* СОБСТВЕННИКОВ ИМУЩЕСТВА|^ОСИ( |$)/],
  [
    "coop",
    /КООПЕРАТИВ|(^| )(ПК|СПК|СХПК|СПРК|ЖСК|ЖК|ПГК|ГПК|ПОК|ПРК|ПКСГ|ПКСД|ПКСТ|СПКВ|СПКВП)( |$)/,
  ],
  [
    "gov_enterprise",
    /ГОСУ?ДА\S*.*ПРЕД(П|\S*ЯТИ)|^(ГКП|КГКП|ГККП|ККГП|КГП|РГП|РГКП|ГП|ДГП|ГКППХВ)( |$)/,
  ],
  ["gov_institution", /ГОСУДА\S*.*УЧЕ?РЕЖД|^(ГУ|КГУ|РГУ|ГКУ)( |$)/],
  [
    "association",
    /ОБ[ЪЬ]?ЕД[ИЕ]Н|АССОЦИАЦИ|СОЮЗ( |$)|ПАЛАТА( |$)|КОЛЛЕГИЯ( |$)|^ПРОФЕССИОНАЛЬН|ОБЩЕСТВЕНН\S* ОРГАНИЗАЦ|^(ОО|ООО|ООИ|ОЮЛ|РОО|МОО|МРО|МПРО|РО|ОИП|ОИПЮЛ|ПЮК|ПОБ|ПО)( |$)|^\S+ ОО( |$)/,
  ],
  ["fund", /ФОНД( |$)|(^| )(ОФ|ЧФ|КФ|БФ|ФД|Ф-Д|ОФД|ОБФ|ЧБФ|БЧФ|БОФ)( |$)/],
  [
    "institution",
    /УЧЕ?РЕЖД|(^| )(ЧУ|ЧУ-Е|У|У-Е|УЕ|УЧ-Е|НУ|НГУ|НЕГУ|НУО|ЧУО|УО|БУ)( |$)/,
  ],
];
export const splitName = (name) => {
  const text = name.replace(/''/g, '"');
  const first = text.search(QUOTES);
  if (first === -1) return { form: text, inner: "" };

  let last = first;
  for (let i = text.length - 1; i > first; i -= 1) {
    if (QUOTES.test(text[i])) {
      last = i;
      break;
    }
  }

  const head = text.slice(0, first);
  const tail = last > first ? text.slice(last + 1) : "";
  const inner =
    last > first ? text.slice(first + 1, last) : text.slice(first + 1);

  return {
    form: head.trim() ? head : tail.trim() ? tail : inner,
    inner,
  };
};

const formHead = (form) =>
  upper(form)
    .replace(/[^А-ЯA-Z0-9-]+/g, " ")
    .trim();

const matchForm = (list, form) => {
  const head = formHead(form);
  for (const [code, pattern] of list) {
    if (pattern.test(head)) return code;
  }
  return "other";
};

export const legalFormOf = (form) => {
  const head = formHead(form);
  const spaced = head.replace(/\s*-\s*/g, " ");
  for (const [code, pattern] of LEGAL_FORMS) {
    if (pattern.test(head) || pattern.test(spaced)) return code;
  }
  return "other";
};

const keyFormOf = (form) => matchForm(KEY_FORMS, form);
const INNER_FORM =
  /^[\s"«»“”„]*(?:ТОО|ЖШС|АО|АҚ)\s+|\s+(?:ТОО|ЖШС)[\s"«»“”„]*$/g;

export const nameKeyOf = (nameRu) => {
  const name = String(nameRu || "");
  if (!name.trim()) return "";
  const parts = splitName(name);
  const core = letters(upper(parts.inner || name).replace(INNER_FORM, " "));
  return `${keyFormOf(parts.form)}|${core}`;
};

export const directorKeyOf = (name) => letters(upper(name));

const NUMBERED_WORDS = [
  [/(?<![\p{L}])(?:МИКРОРАЙОН|МКРН|МКР-Н|МКР)\.?(?![\p{L}])/gu, " МКР "],
  [/(?<![\p{L}])КВАРТАЛ(?![\p{L}])/gu, " КВЛ "],
  [/(?<![\p{L}])ЖИЛОЙ МАССИВ(?![\p{L}])/gu, " ЖМ "],
];

const STREET_WORDS =
  /(?<![\p{L}])(?:УЛИЦА|УЛ|ПРОСПЕКТ|ПР-КТ|ПР-Т|ПР|ПЕРЕУЛОК|ПЕР|БУЛЬВАР|БУЛ|Б-Р|ШОССЕ|ШОС|ПРОЕЗД|ТУПИК|ПЛОЩАДЬ|ПЛ|НАБЕРЕЖНАЯ|АЛЛЕЯ|ТРАССА|КӨШЕСІ|ДАҢҒЫЛЫ|ИМЕНИ|ИМ)\.?(?![\p{L}])/gu;

const streetPart = (value) => {
  let text = upper(value);
  for (const [pattern, short] of NUMBERED_WORDS)
    text = text.replace(pattern, short);
  return letters(text.replace(STREET_WORDS, " "));
};

export const buildingKeyOf = (parsed, kato) => {
  const full = [parsed.type, parsed.street].filter(Boolean).join(" ");
  if (full) {
    const segments = full.split(/\s*,\s*/).filter(Boolean);
    const street = streetPart(segments[segments.length - 1] || full);
    return `${kato}|${street}|${letters(upper(parsed.house))}`;
  }
  const whole = streetPart(parsed.text || "");
  return whole ? `${kato}|${whole}|` : "";
};

export const unitKeyOf = (unit) => {
  if (unit.number) return letters(upper(unit.number)) || unit.number;
  if (unit.floor) return `ЭТАЖ${unit.floor}`;
  return "";
};

export const tailOf = (key) => key.slice(key.indexOf("|"));
