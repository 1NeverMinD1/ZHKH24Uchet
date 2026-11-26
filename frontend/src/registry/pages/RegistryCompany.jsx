import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryCompany } from "../../api/registry";
import {
  fullNameOf,
  cityOf,
  placeOf,
  periodText,
  formatDate,
  BINDEX_URL,
} from "../format";

function Status({ text }) {
  return (
    <section className="rg">
      <div className="rg__inner">
        <p className="rg__status">{text}</p>
      </div>
    </section>
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
  const [tab, setTab] = useState("now");

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

  const { company, houses } = result.data;
  const name = fullNameOf(company, locale);
  const now = houses.filter((h) => !h.ended_at);
  const past = houses.filter((h) => h.ended_at);
  const complexes = new Set(
    now.filter((h) => h.complex_slug).map((h) => h.complex_slug),
  );
  const list = tab === "now" ? now : past;

  const facts = [
    [t("registry.bin"), company.bin],
    [t("registry.company.city"), cityOf(company, locale)],
    [t("registry.company.registered"), formatDate(company.registration_date)],
    [t("registry.company.director"), company.director_name],
    [t("registry.company.address"), company.legal_address],
  ].filter(([, value]) => value);

  return (
    <section className="rg">
      <SEO title={t("registry.company.seoTitle", { name })} noindex />
      <div className="rg__inner">
        <div className="rg__head">
          <div className="rg__badges">
            {company.zhkh_type && (
              <span className={`rg__badge rg__badge--${company.zhkh_type}`}>
                {t(`registry.type.${company.zhkh_type}`)}
              </span>
            )}
            {company.status === "gone" && (
              <span className="rg__badge rg__badge--gone">
                {t("registry.status.gone")}
              </span>
            )}
          </div>
          <h1 className="rg__name">{name}</h1>
          <dl className="rg__facts">
            {facts.map(([label, value]) => (
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

        <div className="rg__stats">
          <div className="rg__stat">
            <span className="rg__tile-value">{now.length}</span>
            <span className="rg__tile-label">
              {t("registry.company.housesNow")}
            </span>
          </div>
          <div className="rg__stat">
            <span className="rg__tile-value">{past.length}</span>
            <span className="rg__tile-label">
              {t("registry.company.housesPast")}
            </span>
          </div>
          <div className="rg__stat">
            <span className="rg__tile-value">{complexes.size}</span>
            <span className="rg__tile-label">
              {t("registry.company.complexes")}
            </span>
          </div>
        </div>

        <div className="rg__section">
          <div className="rg__tabs">
            <button
              type="button"
              className={`rg__tab${tab === "now" ? " rg__tab--active" : ""}`}
              onClick={() => setTab("now")}
            >
              {t("registry.company.tabNow", { count: now.length })}
            </button>
            <button
              type="button"
              className={`rg__tab${tab === "past" ? " rg__tab--active" : ""}`}
              onClick={() => setTab("past")}
            >
              {t("registry.company.tabPast", { count: past.length })}
            </button>
          </div>

          {list.length === 0 ? (
            <p className="rg__status">
              {t(
                tab === "now"
                  ? "registry.company.emptyNow"
                  : "registry.company.emptyPast",
              )}
            </p>
          ) : (
            <div className="rg__rows">
              {list.map((h) => (
                <Link
                  key={`${h.address_id}-${h.started_at}`}
                  to={`/house/${h.address_id}`}
                  className="rg__row"
                >
                  <div className="rg__row-main">
                    <span className="rg__row-title">{h.address}</span>
                    <span className="rg__card-meta">
                      {placeOf(h, locale) && <span>{placeOf(h, locale)}</span>}
                      {h.complex_name && (
                        <span>
                          {t("registry.complexLabel", { name: h.complex_name })}
                        </span>
                      )}
                      {h.service_kind && <span>{h.service_kind}</span>}
                    </span>
                  </div>
                  <span className="rg__row-side">{periodText(h, t)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
