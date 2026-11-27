import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryHouse } from "../../api/registry";
import {
  nameOf,
  cityOf,
  districtOf,
  placeOf,
  periodText,
  formatDate,
  BINDEX_URL,
} from "../format";
import ComplexPassport from "../ComplexPassport";

const EARLY = "2018-01-01";

function Status({ text }) {
  return (
    <section className="rg">
      <div className="rg__inner">
        <p className="rg__status">{text}</p>
      </div>
    </section>
  );
}

function ManagementRow({ item, locale, t }) {
  return (
    <Link to={`/company/${item.slug}`} className="rg__row">
      <div className="rg__row-main">
        <div className="rg__badges">
          <span className={`rg__badge rg__badge--${item.role}`}>
            {t(`registry.type.${item.role}`)}
          </span>
          {item.status !== "active" && (
            <span className="rg__badge rg__badge--gone">
              {t("registry.status.gone")}
            </span>
          )}
        </div>
        <span className="rg__row-title">{nameOf(item, locale)}</span>
        <span className="rg__card-meta">
          <span>
            {t("registry.bin")} {item.bin}
          </span>
          {item.service_kind && <span>{item.service_kind}</span>}
        </span>
      </div>
      <span className="rg__row-side">{periodText(item, t)}</span>
    </Link>
  );
}

function CompanyLinkRow({ c, locale, t }) {
  const content = (
    <div className="rg__row-main">
      <span className="rg__mini-title">{nameOf(c, locale)}</span>
      <span className="rg__card-meta">
        <span>
          {t("registry.bin")} {c.bin}
        </span>
        {c.legal_form && <span>{t(`legalForm.${c.legal_form}`)}</span>}
        {c.units && <span>{c.units}</span>}
      </span>
    </div>
  );
  return c.zhkh_registry ? (
    <Link to={`/company/${c.slug}`} className="rg__mini-row">
      {content}
    </Link>
  ) : (
    <a
      className="rg__mini-row"
      href={`${BINDEX_URL}/${locale}/company/${c.slug}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {content}
    </a>
  );
}

export default function RegistryHouse() {
  const { id } = useParams();
  const { locale, t } = useLocale();
  const [result, setResult] = useState({ id: null, data: null, failed: false });
  const [showAllCompanies, setShowAllCompanies] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRegistryHouse(id)
      .then((data) => {
        if (!cancelled) setResult({ id, data, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ id, data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (result.id !== id) return <Status text={t("common.loading")} />;
  if (result.failed || !result.data)
    return <Status text={t("registry.notFound")} />;

  const { house, managements, companies = [], neighbors = [] } = result.data;
  const now = managements.filter((m) => !m.ended_at);
  const past = managements.filter((m) => m.ended_at);
  const lastPast = past[0];
  const companiesCount = house.companies ?? companies.length;
  const who = (m) =>
    `${t(`registry.typeOne.${m.role}`)} «${nameOf(m, locale)}»`;

  const summary = [
    now.length > 0
      ? now
          .map((m) =>
            t("registry.houseSummary.now", {
              who: who(m),
              since: periodText(m, t),
            }),
          )
          .join(" ")
      : lastPast
        ? t("registry.houseSummary.noneSince", {
            date: formatDate(lastPast.ended_at),
          })
        : t("registry.houseSummary.none"),
    lastPast &&
      t("registry.houseSummary.before", {
        who: who(lastPast),
        period: periodText(lastPast, t),
      }),
    companiesCount > 0 &&
      t("registry.houseSummary.companies", { count: companiesCount }),
  ]
    .filter(Boolean)
    .join(" ");

  const chips = [
    now.length > 0
      ? { key: "managed", tone: "", text: t("registry.houseChip.managed") }
      : {
          key: "managed",
          tone: "warn",
          text: t("registry.houseChip.noManager"),
        },
    past.length > 0 && {
      key: "changes",
      tone: past.length >= 2 ? "warn" : "",
      text: t("registry.houseChip.changes", { count: past.length }),
    },
    house.complex_name && {
      key: "complex",
      tone: "",
      text: t("registry.complexLabel", { name: house.complex_name }),
    },
    companiesCount > 0 && {
      key: "companies",
      tone: "",
      text: t("registry.houseChip.companies", { count: companiesCount }),
    },
  ].filter(Boolean);

  const timeline = [
    ...managements.map((m) => ({
      key: `s${m.bin}${m.role}${m.started_at}`,
      date: m.started_at,
      early: m.started_at && m.started_at <= EARLY,
      title: t("registry.event.manageStart"),
      detail: who(m),
      to: `/company/${m.slug}`,
    })),
    ...past.map((m) => ({
      key: `e${m.bin}${m.role}${m.ended_at}`,
      date: m.ended_at,
      title: t("registry.event.manageEnd"),
      detail: who(m),
      note:
        now.length === 0 && m === lastPast ? t("registry.event.manageGap") : "",
      to: `/company/${m.slug}`,
    })),
  ]
    .filter((item) => item.date)
    .sort((a, b) => b.date.localeCompare(a.date));

  const about = [
    [t("registry.house.city"), cityOf(house, locale)],
    [t("registry.house.district"), districtOf(house, locale)],
    [t("registry.house.companies"), companiesCount || null],
    [t("registry.house.units"), house.units || null],
    [t("registry.house.apartments"), house.apartments],
    [t("registry.house.floors"), house.floors],
    [t("registry.house.year"), house.year_built],
  ].filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  return (
    <section className="rg">
      <SEO
        title={t("registry.house.seoTitle", { address: house.address })}
        noindex
      />
      <div className="rg__inner">
        <nav className="rg__crumbs">
          <Link to="/">{t("registry.crumbs.home")}</Link>
          <span className="rg__crumbs-sep">→</span>
          <Link to="/houses">{t("registry.houses.title")}</Link>
          <span className="rg__crumbs-sep">→</span>
          <span>{house.address}</span>
        </nav>

        <div className="rg__head">
          <h1 className="rg__name">{house.address}</h1>
          <span className="rg__card-meta">
            {placeOf(house, locale) && <span>{placeOf(house, locale)}</span>}
            {house.complex_name && (
              <Link to={`/complex/${house.complex_slug}`}>
                {t("registry.complexLabel", { name: house.complex_name })}
              </Link>
            )}
          </span>
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
        </div>

        <div className="rg__layout">
          <div className="rg__main">
            <div className="rg__section">
              <h2 className="rg__subtitle">{t("registry.houseSection.now")}</h2>
              {now.length === 0 ? (
                <p className="rg__status">{t("registry.house.nowEmpty")}</p>
              ) : (
                <div className="rg__rows">
                  {now.map((m) => (
                    <ManagementRow
                      key={`${m.bin}-${m.role}`}
                      item={m}
                      locale={locale}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>

            {timeline.length > 0 && (
              <div className="rg__section">
                <h2 className="rg__subtitle">
                  {t("registry.houseSection.history")}
                </h2>
                <div className="rg__panel">
                  <ol className="rg__tl">
                    {timeline.map((item) => (
                      <li key={item.key} className="rg__tl-item">
                        <span className="rg__tl-date">
                          {item.early
                            ? `≤ ${formatDate(item.date)}`
                            : formatDate(item.date)}
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
                        {item.note && (
                          <span className="rg__tl-note">{item.note}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            <div className="rg__section">
              <h2 className="rg__subtitle">
                {t("registry.houseSection.companies", {
                  count: companiesCount,
                })}
              </h2>
              <div className="rg__panel">
                {companies.length === 0 ? (
                  <p className="rg__status">
                    {t("registry.houseSection.companiesEmpty")}
                  </p>
                ) : (
                  <div className="rg__mini">
                    {(showAllCompanies ? companies : companies.slice(0, 8)).map(
                      (c) => (
                        <CompanyLinkRow
                          key={c.bin}
                          c={c}
                          locale={locale}
                          t={t}
                        />
                      ),
                    )}
                  </div>
                )}
                {companies.length > 8 && (
                  <button
                    type="button"
                    className="rg__panel-link"
                    onClick={() => setShowAllCompanies((value) => !value)}
                  >
                    {showAllCompanies
                      ? t("registry.section.historyLess")
                      : t("registry.houseSection.companiesAll", {
                          count: companies.length,
                        })}
                  </button>
                )}
                <a
                  className="rg__ext"
                  href={`${BINDEX_URL}/${locale}/address/${house.address_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("registry.toBindexAddress")}
                </a>
              </div>
            </div>
          </div>

          <aside className="rg__aside">
            <div className="rg__panel">
              <h2 className="rg__panel-title">
                {t("registry.houseSection.about")}
              </h2>
              <dl className="rg__facts">
                {about.map(([label, value]) => (
                  <div key={label} className="rg__fact">
                    <dt className="rg__fact-label">{label}</dt>
                    <dd className="rg__fact-value">{value}</dd>
                  </div>
                ))}
                {house.complex_name && (
                  <div className="rg__fact">
                    <dt className="rg__fact-label">
                      {t("registry.house.complex")}
                    </dt>
                    <dd className="rg__fact-value">
                      <Link to={`/complex/${house.complex_slug}`}>
                        {house.complex_name}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <ComplexPassport passport={house.passport} />

            {neighbors.length > 0 && (
              <div className="rg__panel">
                <h2 className="rg__panel-title">
                  {t("registry.houseSection.neighbors", {
                    count: neighbors.length,
                  })}
                </h2>
                <div className="rg__mini">
                  {neighbors.map((n) => (
                    <Link
                      key={n.address_id}
                      to={`/house/${n.address_id}`}
                      className="rg__mini-row"
                    >
                      <div className="rg__row-main">
                        <span className="rg__mini-title">{n.address}</span>
                        <span className="rg__card-meta">
                          {n.manager
                            ? `${t(`registry.type.${n.manager.role}`)} · ${nameOf(n.manager, locale)}`
                            : t("registry.houses.noManager")}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
