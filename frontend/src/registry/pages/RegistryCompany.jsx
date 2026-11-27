import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryCompany } from "../../api/registry";
import {
  fullNameOf,
  nameOf,
  cityOf,
  placeOf,
  periodText,
  formatDate,
  pluralKey,
  BINDEX_URL,
} from "../format";

const EARLY = "2018-01-01";

const monthYear = (value) =>
  value ? `${value.slice(5, 7)}.${value.slice(0, 4)}` : "";

function Status({ text }) {
  return (
    <section className="rg">
      <div className="rg__inner">
        <p className="rg__status">{text}</p>
      </div>
    </section>
  );
}

function HouseRow({ h, locale, t }) {
  return (
    <Link to={`/house/${h.address_id}`} className="rg__row">
      <div className="rg__row-main">
        <span className="rg__row-title">{h.address}</span>
        <span className="rg__card-meta">
          {placeOf(h, locale) && <span>{placeOf(h, locale)}</span>}
          {h.complex_name && (
            <span>{t("registry.complexLabel", { name: h.complex_name })}</span>
          )}
          {h.service_kind && <span>{h.service_kind}</span>}
        </span>
      </div>
      <span className="rg__row-side">{periodText(h, t)}</span>
    </Link>
  );
}

const levelOf = (company, metrics, housesNow) => {
  if (company.status !== "active") return "high";
  const changes = metrics.addressChanges12 + metrics.directorChanges12;
  if (changes >= 3) return "high";
  if (changes >= 1 || housesNow === 0) return "medium";
  return "low";
};

const yearsBetween = (from, to) => {
  if (!from || !to) return null;
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  return Math.max(0, Math.floor((b - a) / (365.25 * 24 * 3600 * 1000)));
};

export default function RegistryCompany() {
  const { slug } = useParams();
  const { locale, t } = useLocale();
  const [result, setResult] = useState({
    slug: null,
    data: null,
    failed: false,
  });
  const [tab, setTab] = useState("overview");
  const [housesTab, setHousesTab] = useState("now");

  useEffect(() => {
    let cancelled = false;
    fetchRegistryCompany(slug)
      .then((data) => {
        if (!cancelled) setResult({ slug, data, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ slug, data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (result.slug !== slug) return <Status text={t("common.loading")} />;
  if (result.failed || !result.data)
    return <Status text={t("registry.notFound")} />;

  const { company, houses, events, metrics, director, lastSnapshot } =
    result.data;
  const name = nameOf(company, locale);
  const fullName = fullNameOf(company, locale);
  const now = houses.filter((h) => !h.ended_at);
  const past = houses.filter((h) => h.ended_at);
  const level = levelOf(company, metrics, now.length);
  const years = yearsBetween(company.registration_date, lastSnapshot);
  const oked =
    locale === "kk"
      ? company.oked_name_kk || company.oked_name_ru
      : company.oked_name_ru;

  const metaLine = [
    `${t("registry.bin")} ${company.bin}`,
    company.oked_code &&
      `${t("registry.oked")} ${company.oked_code}${oked ? ` «${oked}»` : ""}`,
    cityOf(company, locale),
  ]
    .filter(Boolean)
    .join(" · ");

  const strip = [
    [now.length, t("registry.strip.housesNow")],
    [past.length, t("registry.strip.housesPast")],
    [metrics.directorChanges, t("registry.strip.directorChanges")],
    [metrics.addressChanges12, t("registry.strip.addressChanges12")],
    [years ?? "—", t(`registry.strip.years.${pluralKey(years || 0)}`)],
  ];

  const directorReview = !director
    ? { tone: "warn", text: t("registry.review.directorNone") }
    : metrics.directorChanges12 === 0
      ? {
          tone: "ok",
          text: t(
            director.sinceEarly
              ? "registry.review.directorStableEarly"
              : "registry.review.directorStable",
            { date: monthYear(director.since) },
          ),
        }
      : {
          tone: metrics.directorChanges12 >= 2 ? "bad" : "warn",
          text: t("registry.review.directorSome", {
            count: metrics.directorChanges12,
          }),
        };

  const review = [
    {
      key: "address",
      weight: "high",
      tone:
        metrics.addressChanges12 === 0
          ? "ok"
          : metrics.addressChanges12 === 1
            ? "warn"
            : "bad",
      text:
        metrics.addressChanges12 === 0
          ? t("registry.review.addressNone")
          : t("registry.review.addressSome", {
              count: metrics.addressChanges12,
            }),
    },
    { key: "director", weight: "high", ...directorReview },
    {
      key: "status",
      weight: "high",
      tone: company.status === "active" ? "ok" : "bad",
      text: t(
        company.status === "active"
          ? "registry.review.statusActive"
          : "registry.review.statusGone",
      ),
    },
    {
      key: "houses",
      weight: "mid",
      tone: now.length > 0 ? "ok" : "warn",
      text:
        now.length > 0
          ? t("registry.review.housesNow", { count: now.length })
          : past.length > 0
            ? t("registry.review.housesLost", { count: past.length })
            : t("registry.review.housesEmpty"),
    },
    {
      key: "name",
      weight: "low",
      tone: metrics.nameChanges === 0 ? "ok" : "warn",
      text:
        metrics.nameChanges === 0
          ? t("registry.review.nameNone")
          : t("registry.review.nameSome", { count: metrics.nameChanges }),
    },
  ];

  const eventDetail = (e) => {
    if (e.type === "gone") return null;
    const from =
      locale === "kk" && e.type === "name" ? e.fromKk || e.from : e.from;
    const to = locale === "kk" && e.type === "name" ? e.toKk || e.to : e.to;
    return `${from || "—"} → ${to || "—"}`;
  };

  const timeline = [
    ...(company.registration_date
      ? [
          {
            key: "reg",
            date: company.registration_date,
            title: t("registry.event.registered"),
          },
        ]
      : []),
    ...events.map((e, i) => ({
      key: `e${i}`,
      date: e.date,
      title: t(`registry.event.${e.type}`),
      detail: eventDetail(e),
    })),
    ...houses
      .filter((h) => h.started_at && h.started_at > EARLY)
      .map((h) => ({
        key: `hs${h.address_id}${h.started_at}`,
        date: h.started_at,
        title: t("registry.event.houseStart"),
        detail: h.address,
        to: `/house/${h.address_id}`,
      })),
    ...houses
      .filter((h) => h.ended_at)
      .map((h) => ({
        key: `he${h.address_id}${h.ended_at}`,
        date: h.ended_at,
        title: t("registry.event.houseEnd"),
        detail: h.address,
        to: `/house/${h.address_id}`,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const historyCount = timeline.length;

  const details = [
    [t("registry.details.fullName"), fullName],
    [t("registry.company.registered"), formatDate(company.registration_date)],
    [t("registry.company.address"), company.legal_address],
  ].filter(([, value]) => value);

  return (
    <section className="rg">
      <SEO title={t("registry.company.seoTitle", { name })} noindex />
      <div className="rg__inner">
        <nav className="rg__crumbs">
          <Link to="/">{t("registry.crumbs.home")}</Link>
          <span className="rg__crumbs-sep">→</span>
          <Link to="/companies">{t("registry.companies.title")}</Link>
          <span className="rg__crumbs-sep">→</span>
          <span>{name}</span>
        </nav>

        <div className="rg__head">
          <div className="rg__head-top">
            <div className="rg__head-title">
              {company.zhkh_type && (
                <span className={`rg__badge rg__badge--${company.zhkh_type}`}>
                  {t(`registry.type.${company.zhkh_type}`)}
                </span>
              )}
              <h1 className="rg__name">{name}</h1>
            </div>
            <span className={`rg__pill rg__pill--${level}`}>
              {t(`registry.level.${level}`)}
            </span>
          </div>
          <p className="rg__meta-line">{metaLine}</p>
          <div className="rg__strip">
            {strip.map(([value, label]) => (
              <div key={label} className="rg__strip-cell">
                <span className="rg__strip-value">{value}</span>
                <span className="rg__strip-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rg__ptabs">
          <button
            type="button"
            className={`rg__ptab${tab === "overview" ? " rg__ptab--active" : ""}`}
            onClick={() => setTab("overview")}
          >
            {t("registry.tab.overview")}
          </button>
          <button
            type="button"
            className={`rg__ptab${tab === "houses" ? " rg__ptab--active" : ""}`}
            onClick={() => setTab("houses")}
          >
            {t("registry.tab.houses", { count: now.length })}
          </button>
          <button
            type="button"
            className={`rg__ptab${tab === "history" ? " rg__ptab--active" : ""}`}
            onClick={() => setTab("history")}
          >
            {t("registry.tab.history", { count: historyCount })}
          </button>
        </div>

        {tab === "overview" && (
          <>
            <div className="rg__cols">
              <div className="rg__panel">
                <h2 className="rg__panel-title">
                  {t("registry.review.title")}
                </h2>
                <div className="rg__review">
                  {review.map((item) => (
                    <div key={item.key} className="rg__review-item">
                      <span className={`rg__dot rg__dot--${item.tone}`} />
                      <span className="rg__review-text">
                        {t(`registry.review.${item.key}`)} — {item.text}
                      </span>
                      <span className="rg__review-weight">
                        {t(`registry.weight.${item.weight}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rg__side">
                <div className="rg__panel">
                  <h2 className="rg__panel-title">
                    {t("registry.director.title")}
                  </h2>
                  {director ? (
                    <>
                      <span className="rg__person">{director.name}</span>
                      <span className="rg__card-meta">
                        {director.current
                          ? t(
                              director.sinceEarly
                                ? "registry.director.sinceEarly"
                                : "registry.director.since",
                              { date: monthYear(director.since) },
                            )
                          : t("registry.director.former")}
                      </span>
                      {director.othersTotal > 0 && (
                        <>
                          <span className="rg__fact-label">
                            {t("registry.director.others", {
                              count: director.othersTotal,
                            })}
                          </span>
                          <ul className="rg__links">
                            {director.others.map((o) => (
                              <li key={o.bin}>
                                {o.zhkh_registry ? (
                                  <Link to={`/company/${o.slug}`}>
                                    {nameOf(o, locale)}
                                  </Link>
                                ) : (
                                  <a
                                    href={`${BINDEX_URL}/${locale}/company/${o.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {nameOf(o, locale)}
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      <a
                        className="rg__ext"
                        href={`${BINDEX_URL}/${locale}/director/${director.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("registry.director.toBindex")}
                      </a>
                    </>
                  ) : (
                    <span className="rg__card-meta">
                      {t("registry.director.none")}
                    </span>
                  )}
                </div>

                <div className="rg__panel">
                  <h2 className="rg__panel-title">
                    {t("registry.details.title")}
                  </h2>
                  <dl className="rg__facts">
                    {details.map(([label, value]) => (
                      <div key={label} className="rg__fact">
                        <dt className="rg__fact-label">{label}</dt>
                        <dd className="rg__fact-value">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <a
                    className="rg__ext"
                    href={`${BINDEX_URL}/${locale}/company/${company.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("registry.toBindex")}
                  </a>
                </div>
              </div>
            </div>

            <div className="rg__panel">
              <div className="rg__panel-head">
                <h2 className="rg__panel-title">
                  {t("registry.preview.title", { count: now.length })}
                </h2>
                {now.length > 5 && (
                  <button
                    type="button"
                    className="rg__panel-link"
                    onClick={() => setTab("houses")}
                  >
                    {t("registry.preview.all")}
                  </button>
                )}
              </div>
              {now.length === 0 ? (
                <p className="rg__status">{t("registry.company.emptyNow")}</p>
              ) : (
                <div className="rg__mini">
                  {now.slice(0, 5).map((h) => (
                    <Link
                      key={h.address_id}
                      to={`/house/${h.address_id}`}
                      className="rg__mini-row"
                    >
                      <div className="rg__row-main">
                        <span className="rg__mini-title">
                          {h.complex_name
                            ? t("registry.complexLabel", {
                                name: h.complex_name,
                              })
                            : h.address}
                        </span>
                        <span className="rg__card-meta">
                          {[placeOf(h, locale), h.complex_name ? h.address : ""]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <span className="rg__row-side">{periodText(h, t)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "houses" && (
          <div className="rg__section">
            <div className="rg__tabs">
              <button
                type="button"
                className={`rg__tab${housesTab === "now" ? " rg__tab--active" : ""}`}
                onClick={() => setHousesTab("now")}
              >
                {t("registry.company.tabNow", { count: now.length })}
              </button>
              <button
                type="button"
                className={`rg__tab${housesTab === "past" ? " rg__tab--active" : ""}`}
                onClick={() => setHousesTab("past")}
              >
                {t("registry.company.tabPast", { count: past.length })}
              </button>
            </div>
            {(housesTab === "now" ? now : past).length === 0 ? (
              <p className="rg__status">
                {t(
                  housesTab === "now"
                    ? "registry.company.emptyNow"
                    : "registry.company.emptyPast",
                )}
              </p>
            ) : (
              <div className="rg__rows">
                {(housesTab === "now" ? now : past).map((h) => (
                  <HouseRow
                    key={`${h.address_id}-${h.started_at}`}
                    h={h}
                    locale={locale}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="rg__panel">
            {timeline.length === 0 ? (
              <p className="rg__status">{t("registry.history.empty")}</p>
            ) : (
              <ol className="rg__tl">
                {timeline.map((item) => (
                  <li key={item.key} className="rg__tl-item">
                    <span className="rg__tl-date">{formatDate(item.date)}</span>
                    <span className="rg__tl-title">{item.title}</span>
                    {item.detail && (
                      <span className="rg__tl-detail">
                        {item.to ? (
                          <Link to={item.to}>{item.detail}</Link>
                        ) : (
                          item.detail
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
