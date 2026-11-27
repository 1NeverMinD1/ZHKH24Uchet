import { useLocale } from "../i18n/context";

const KK = {
  монолитный: "монолитті",
  кирпичный: "кірпіш",
  панельный: "панельді",
  центральное: "орталықтандырылған",
  автономное: "автономды",
  пассажирский: "жолаушылар",
  грузовой: "жүк",
  грузопассажирский: "жүк-жолаушылар",
  надземный: "жерүсті",
  подземный: "жерасты",
  отсутствует: "жоқ",
  черновая: "қара әрлеу",
  предчистовая: "таза әрлеу алдындағы",
  чистовая: "таза әрлеу",
  "фиброцементные панели": "фиброцемент панельдер",
  "клинкерный кирпич": "клинкер кірпіш",
  "вентилируемый фасад": "желдетілетін қасбет",
  "облицовочный кирпич": "қаптама кірпіш",
  "натуральный камень": "табиғи тас",
  "декоративная штукатурка": "сәндік сылақ",
  "керамический кирпич": "керамикалық кірпіш",
  "hpl-панели": "HPL панельдер",
  "керамическая плитка": "керамикалық плитка",
  "керамические панели": "керамикалық панельдер",
  "стеклянный фасад": "шыны қасбет",
  штукатурка: "сылақ",
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const valueOf = (value, locale) =>
  value
    ? cap(
        String(value)
          .split(", ")
          .map((v) => (locale === "kk" ? KK[v] || v : v))
          .join(", "),
      )
    : null;

export default function ComplexPassport({ passport }) {
  const { locale, t } = useLocale();
  if (!passport) return null;
  const p = passport;
  const floors =
    p.floors_min && p.floors_max && p.floors_min !== p.floors_max
      ? `${p.floors_min}–${p.floors_max}`
      : p.floors_max || p.floors_min;
  const completion =
    locale === "kk"
      ? p.completion_year
      : p.completion_text || p.completion_year;
  const ceiling = p.ceiling_height
    ? `${String(Number(p.ceiling_height)).replace(".", ",")} ${t("registry.passport.meters")}`
    : null;

  const facts = [
    ["developer", p.developer],
    [
      "status",
      p.build_status && t(`registry.passport.status.${p.build_status}`),
    ],
    ["completion", completion],
    ["class", valueOf(p.housing_class, locale)],
    ["floors", floors],
    ["ceiling", ceiling],
    ["walls", valueOf(p.wall_type, locale)],
    ["finishing", valueOf(p.finishing, locale)],
    ["parking", valueOf(p.parking, locale)],
    ["elevator", valueOf(p.elevator, locale)],
    ["heating", valueOf(p.heating, locale)],
    ["facade", valueOf(p.facade, locale)],
  ].filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  if (facts.length === 0) return null;

  return (
    <div className="rg__panel">
      <h2 className="rg__panel-title">{t("registry.passport.title")}</h2>
      <dl className="rg__facts">
        {facts.map(([key, value]) => (
          <div key={key} className="rg__fact">
            <dt className="rg__fact-label">{t(`registry.passport.${key}`)}</dt>
            <dd className="rg__fact-value">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
