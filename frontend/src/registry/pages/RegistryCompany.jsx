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
const HISTORY_PREVIEW = 6;

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

export default function RegistryCompany() {
  const { slug } = useParams();
  const { locale, t } = useLocale();
  const [result, setResult] = useState({
    slug: null,
    data: null,
    failed: false,
  });
  const [showPast, setShowPast] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  const { company, houses, events, metrics, director } = result.data;
  const name = nameOf(company, locale);
  const fullName = fullNameOf(company, locale);
  const now = houses.filter((h) => !h.ended_at);
  const past = houses.filter((h) => h.ended_at);
  const gone = company.status !== "active";
  const goneEvent = events.find((e) => e.type === "gone");
  const typeLabel = company.zhkh_type
    ? t(`registry.typeOne.${company.zhkh_type}`)
    : name;
  const housesWord = (n) => t(`registry.complexes.houses.${pluralKey(n)}`);
  const oked =
    locale === "kk"
      ? company.oked_name_kk || company.oked_name_ru
      : company.oked_name_ru;

  const summary = [
    gone && t("registry.summary.gone", { date: formatDate(goneEvent?.date) }),
    now.length > 0
      ? t("registry.summary.houses", {
          type: typeLabel,
          count: now.length,
          houses: housesWord(now.length),
        })
      : t("registry.summary.noHouses", { type: typeLabel }),
    past.length > 0 &&
      t("registry.summary.pastHouses", {
        count: past.length,
        houses: housesWord(past.length),
      }),
    director &&
      (metrics.directorChanges12 > 0
        ? t("registry.summary.directorChanged", {
            count: metrics.directorChanges12,
          })
        : t(
            director.sinceEarly
              ? "registry.summary.directorStableEarly"
              : "registry.summary.directorStable",
            { date: monthYear(director.since) },
          )),
    metrics.addressChanges12 > 0
      ? t("registry.summary.addressChanged", {
          count: metrics.addressChanges12,
        })
      : t("registry.summary.addressStable"),
  ]
    .filter(Boolean)
    .join(" ");

  const chips = [
    gone && { key: "gone", tone: "bad", text: t("registry.chip.gone") },
    now.length > 0
      ? {
          key: "houses",
          tone: "",
          text: t("registry.chip.houses", {
            count: now.length,
            houses: housesWord(now.length),
          }),
        }
      : { key: "houses", tone: "warn", text: t("registry.chip.noHouses") },
    director &&
      (metrics.directorChanges12 > 0
        ? {
            key: "director",
            tone: metrics.directorChanges12 >= 2 ? "bad" : "warn",
            text: t("registry.chip.directorChanged", {
              count: metrics.directorChanges12,
            }),
          }
        : {
            key: "director",
            tone: "",
            text: t("registry.chip.director", {
              date: monthYear(director.since),
            }),
          }),
    metrics.addressChanges12 > 0
      ? {
          key: "address",
          tone: metrics.addressChanges12 >= 2 ? "bad" : "warn",
          text: t("registry.chip.addressChanged", {
            count: metrics.addressChanges12,
          }),
        }
      : { key: "address", tone: "", text: t("registry.chip.address") },
    company.registration_date && {
      key: "since",
      tone: "",
      text: t("registry.chip.since", {
        year: company.registration_date.slice(0, 4),
      }),
    },
  ].filter(Boolean);

  const metaLine = [
    `${t("registry.bin")} ${company.bin}`,
    company.oked_code &&
      `${t("registry.oked")} ${company.oked_code}${oked ? ` «${oked}»` : ""}`,
    cityOf(company, locale),
  ]
    .filter(Boolean)
    .join(" · ");

  const addressMonths = new Set(
    events.filter((e) => e.type === "address").map((e) => e.date.slice(0, 7)),
  );
  const nextMonth = (value) => {
    const d = new Date(`${value.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString().slice(0, 7);
  };
  const isAddressMove = (date, shift) =>
    addressMonths.has(shift ? nextMonth(date) : date.slice(0, 7));

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
      .filter(
        (h) =>
          h.started_at &&
          h.started_at > EARLY &&
          !isAddressMove(h.started_at, false),
      )
      .map((h) => ({
        key: `hs${h.address_id}${h.started_at}`,
        date: h.started_at,
        title: t("registry.event.houseStart"),
        detail: h.address,
        to: `/house/${h.address_id}`,
      })),
    ...houses
      .filter((h) => h.ended_at && !isAddressMove(h.ended_at, true))
      .map((h) => ({
        key: `he${h.address_id}${h.ended_at}`,
        date: h.ended_at,
        title: t("registry.event.houseEnd"),
        detail: h.address,
        to: `/house/${h.address_id}`,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const visibleTimeline = showHistory
    ? timeline
    : timeline.slice(0, HISTORY_PREVIEW);

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
          <div className="rg__head-title">
            {company.zhkh_type && (
              <span className={`rg__badge rg__badge--${company.zhkh_type}`}>
                {t(`registry.type.${company.zhkh_type}`)}
              </span>
            )}
            <h1 className="rg__name">{name}</h1>
          </div>
          <p className="rg__summary">{summary}</p>
          <div className="rg__chips">
            {chips.map((chip) => (
              <span
                key={chip.key}
                className={`rg__chip${chip.tone ? ` rg__chip--${chip.tone}` : ""}`}
              >
                {chip.text}
              </span>
            ))}
          </div>
          <p className="rg__meta-line">{metaLine}</p>
        </div>

        <div className="rg__layout">
          <div className="rg__main">
            <div className="rg__section">
              <h2 className="rg__subtitle">{t("registry.section.houses")}</h2>
              {now.length === 0 ? (
                <p className="rg__status">{t("registry.company.emptyNow")}</p>
              ) : (
                <div className="rg__rows">
                  {now.map((h) => (
                    <HouseRow
                      key={`${h.address_id}-${h.started_at}`}
                      h={h}
                      locale={locale}
                      t={t}
                    />
                  ))}
                </div>
              )}
              {past.length > 0 && (
                <button
                  type="button"
                  className="rg__panel-link"
                  onClick={() => setShowPast((value) => !value)}
                >
                  {showPast
                    ? t("registry.section.pastHide")
                    : t("registry.section.pastToggle", { count: past.length })}
                </button>
              )}
              {showPast && (
                <div className="rg__rows">
                  {past.map((h) => (
                    <HouseRow
                      key={`${h.address_id}-${h.ended_at}`}
                      h={h}
                      locale={locale}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rg__section">
              <div className="rg__section-head">
                <h2 className="rg__subtitle">
                  {t("registry.section.history")}
                </h2>
                {timeline.length > HISTORY_PREVIEW && (
                  <button
                    type="button"
                    className="rg__panel-link"
                    onClick={() => setShowHistory((value) => !value)}
                  >
                    {showHistory
                      ? t("registry.section.historyLess")
                      : t("registry.section.historyAll", {
                          count: timeline.length,
                        })}
                  </button>
                )}
              </div>
              <div className="rg__panel">
                {timeline.length === 0 ? (
                  <p className="rg__status">{t("registry.history.empty")}</p>
                ) : (
                  <ol className="rg__tl">
                    {visibleTimeline.map((item) => (
                      <li key={item.key} className="rg__tl-item">
                        <span className="rg__tl-date">
                          {formatDate(item.date)}
                        </span>
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
            </div>
          </div>

          <aside className="rg__aside">
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
              <h2 className="rg__panel-title">{t("registry.details.title")}</h2>
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
          </aside>
        </div>
      </div>
    </section>
  );
}
