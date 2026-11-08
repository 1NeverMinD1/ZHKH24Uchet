import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const WIDTH = 1200;
const HEIGHT = 630;
const SITE_NAME = "ЖКХ24 Учет";
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

let fonts: any[] | null = null;

const loadFonts = () => {
  if (!fonts) {
    fonts = [
      {
        name: "PT Sans",
        data: fs.readFileSync(path.join(FONT_DIR, "PTSans-Regular.ttf")),
        weight: 400,
        style: "normal",
      },
      {
        name: "PT Sans",
        data: fs.readFileSync(path.join(FONT_DIR, "PTSans-Bold.ttf")),
        weight: 700,
        style: "normal",
      },
    ];
  }
  return fonts;
};

const FORMS: Record<string, string> = {
  too: "ТОО",
  ao: "АО",
  osi: "ОСИ",
  ksk: "КСК",
  coop: "Кооператив",
  partnership: "Товарищество",
  gov_institution: "Госучреждение",
  gov_enterprise: "Госпредприятие",
  association: "Общественное объединение",
  fund: "Фонд",
  institution: "Частное учреждение",
  lawyers: "Адвокатское образование",
  religious: "Религиозное объединение",
  aifc: "Компания МФЦА",
  branch: "Филиал",
};

const SHORT_FORMS: Record<string, string> = {
  too: "ТОО",
  ao: "АО",
  osi: "ОСИ",
  ksk: "КСК",
};

const OWNERSHIP_GROUPS: Record<string, string> = {
  "12": "state",
  "13": "state",
  "23": "state",
  "19": "private",
  "28": "foreign",
  "36": "foreign",
  "37": "foreign",
  "29": "public",
};

const OWNERSHIP_STYLES: Record<
  string,
  { label: string; color: string; background: string; accent: string }
> = {
  state: {
    label: "Государственная собственность",
    color: "#1d4f91",
    background: "#e3edfa",
    accent: "#3a6ea5",
  },
  private: {
    label: "Частная собственность",
    color: "#1f6b43",
    background: "#e8f5ee",
    accent: "#2e8b57",
  },
  foreign: {
    label: "Иностранное участие",
    color: "#5b3a99",
    background: "#efe8fa",
    accent: "#7a52c7",
  },
  public: {
    label: "Общественная организация",
    color: "#8a5a12",
    background: "#fbf1de",
    accent: "#c98a1e",
  },
};

const h = (type: string, style: any, children?: any) => ({
  type,
  props: { style, children },
});

const badge = (text: string, color: string, background: string) =>
  h(
    "div",
    {
      display: "flex",
      padding: "8px 18px",
      fontSize: 24,
      fontWeight: 700,
      color,
      background,
      borderRadius: 8,
    },
    text,
  );

const TREND_COLORS: Record<string, string> = {
  up: "#1f6b43",
  down: "#a12b2b",
  changed: "#8a5a12",
  same: "#8a93a0",
};

const arrow = (direction: string, color: string) => ({
  type: "svg",
  props: {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    style: { marginRight: 8 },
    children: {
      type: "path",
      props: {
        d: direction === "up" ? "M12 3l9 16H3z" : "M12 21L3 5h18z",
        fill: color,
      },
    },
  },
});

const tile = (label: string, value: string, note: string, trend: string) =>
  h(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      padding: "18px 22px",
      background: "#f4f7fb",
      borderRadius: 12,
    },
    [
      h("div", { display: "flex", fontSize: 20, color: "#8a93a0" }, label),
      h(
        "div",
        {
          display: "flex",
          marginTop: 6,
          fontSize: 30,
          fontWeight: 700,
          color: "#1c1c1c",
        },
        value,
      ),
      h(
        "div",
        {
          display: "flex",
          alignItems: "center",
          marginTop: 6,
          fontSize: 20,
          color: TREND_COLORS[trend] || TREND_COLORS.same,
        },
        trend === "up" || trend === "down"
          ? [arrow(trend, TREND_COLORS[trend]), note]
          : note,
      ),
    ],
  );

const shortKrp = (name: string) => {
  const match = String(name || "").match(/\(([^)]+)\)/);
  if (!match) return "";
  return `${match[1]
    .replace(/<=\s*/, "до ")
    .replace(/>\s*/, "более ")
    .replace(/\s*-\s*/, "–")
    .trim()} чел.`;
};

export const summarizeChanges = (periods: any[], latestOn: string) => {
  if (!periods.length || !latestOn) return null;
  const last = periods[periods.length - 1];

  let year = Number(latestOn.slice(0, 4));
  if (latestOn.slice(5, 7) === "01") year -= 1;
  const baseOn = `${year}-01-01`;
  const base =
    periods.find((p) => p.from_on <= baseOn && p.to_on >= baseOn) || null;

  const sinceOf = (key: string) => {
    let from = last.from_on;
    for (let i = periods.length - 1; i >= 0; i -= 1) {
      if (periods[i][key] !== last[key]) break;
      from = periods[i].from_on;
    }
    return from.slice(0, 4);
  };

  let krpTrend = "same";
  if (
    base &&
    base.krp_code &&
    last.krp_code &&
    base.krp_code !== last.krp_code
  ) {
    krpTrend = Number(last.krp_code) > Number(base.krp_code) ? "up" : "down";
  }

  const limit = `${Number(latestOn.slice(0, 4)) - 1}${latestOn.slice(4)}`;
  let recent = 0;
  for (let i = 1; i < periods.length; i += 1) {
    const prev = periods[i - 1];
    const next = periods[i];
    if (next.from_on <= limit) continue;
    if (
      prev.name_id !== next.name_id ||
      prev.director_id !== next.director_id ||
      prev.address_id !== next.address_id ||
      prev.oked_code !== next.oked_code ||
      prev.krp_code !== next.krp_code
    ) {
      recent += 1;
    }
  }

  return {
    year,
    krpTrend,
    directorChanged: Boolean(base) && base.director_id !== last.director_id,
    directorSince: sinceOf("director_id"),
    addressChanged: Boolean(base) && base.address_id !== last.address_id,
    addressSince: sinceOf("address_id"),
    frequent: recent >= 3,
  };
};

const tilesOf = (changes: any, company: any) => {
  const period = `в ${changes.year} году`;
  const krpNote =
    changes.krpTrend === "up"
      ? `вырос ${period}`
      : changes.krpTrend === "down"
        ? `снизился ${period}`
        : "без изменений";
  return h("div", { display: "flex", width: "100%", gap: 16, marginTop: 28 }, [
    tile(
      "Размер",
      shortKrp(company.krp_name_ru) || "нет данных",
      krpNote,
      changes.krpTrend,
    ),
    tile(
      "Руководитель",
      changes.directorChanged ? "Сменился" : `с ${changes.directorSince} года`,
      changes.directorChanged ? period : "без изменений",
      changes.directorChanged ? "changed" : "same",
    ),
    tile(
      "Адрес",
      changes.addressChanged ? "Переезд" : `с ${changes.addressSince} года`,
      changes.addressChanged ? period : "без изменений",
      changes.addressChanged ? "changed" : "same",
    ),
  ]);
};

const displayName = (name: string, form: string) => {
  const text = String(name || "").replace(/''/g, '"');
  const match = text.match(/[«"“„](.+)[»"”]/);
  const inner = match ? match[1].replace(/[«»"“”„]/g, "").trim() : "";
  if (SHORT_FORMS[form] && inner) return `${SHORT_FORMS[form]} «${inner}»`;
  return text;
};

const monthYear = (value: string) => {
  if (!value) return "";
  const [year, month] = value.split("-");
  return `${month}.${year}`;
};

export const renderCompanyCard = async (
  company: any,
  changes: any = null,
): Promise<Buffer> => {
  const ownershipKey = OWNERSHIP_GROUPS[String(company.kfs_code || "").trim()];
  const ownership = ownershipKey ? OWNERSHIP_STYLES[ownershipKey] : null;
  const accent = ownership ? ownership.accent : "#8a93a0";

  let name = displayName(company.name_ru, company.legal_form);
  const maxLength = changes ? 100 : 110;
  if (name.length > maxLength) {
    name = `${name.slice(0, maxLength - 1).trimEnd()}…`;
  }
  const nameSize = changes
    ? name.length <= 40
      ? 52
      : name.length <= 70
        ? 44
        : 38
    : name.length <= 40
      ? 64
      : name.length <= 70
        ? 52
        : 44;

  const badges = [
    FORMS[company.legal_form]
      ? badge(FORMS[company.legal_form], "#2b4c7e", "#eef1f5")
      : null,
    ownership
      ? badge(ownership.label, ownership.color, ownership.background)
      : null,
    changes?.frequent ? badge("Часто менялась", "#8a5a12", "#fbf1de") : null,
    company.status === "gone"
      ? badge(
          `Выбыла из реестра ${monthYear(company.last_seen)}`,
          "#a12b2b",
          "#fbeaea",
        )
      : null,
  ].filter(Boolean);

  const footer = [
    company.registration_date
      ? `Зарегистрирована в ${company.registration_date.slice(0, 4)} году`
      : "",
    company.locality_ru || "",
  ]
    .filter(Boolean)
    .join(" · ");

  const tree = h(
    "div",
    {
      width: WIDTH,
      height: HEIGHT,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "56px 64px",
      background: "#ffffff",
      borderLeft: `18px solid ${accent}`,
      fontFamily: "PT Sans",
      boxSizing: "border-box",
    },
    [
      h("div", { display: "flex", flexWrap: "wrap", gap: 12 }, badges),
      h(
        "div",
        { display: "flex", flexDirection: "column", width: "100%" },
        [
          h(
            "div",
            {
              display: "flex",
              width: "100%",
              fontSize: nameSize,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#2b4c7e",
            },
            name,
          ),
          h(
            "div",
            { display: "flex", marginTop: 20, fontSize: 30, color: "#5b6472" },
            `БИН ${company.bin}`,
          ),
          changes ? tilesOf(changes, company) : null,
        ].filter(Boolean),
      ),
      h(
        "div",
        {
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: 26,
          color: "#5b6472",
        },
        [
          h("div", { display: "flex", maxWidth: 820 }, footer || " "),
          h(
            "div",
            { display: "flex", fontWeight: 700, color: "#3a6ea5" },
            SITE_NAME,
          ),
        ],
      ),
    ],
  );

  const svg = await satori(tree as any, {
    width: WIDTH,
    height: HEIGHT,
    fonts: loadFonts(),
  });

  return new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } })
    .render()
    .asPng();
};
