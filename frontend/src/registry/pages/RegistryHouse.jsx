import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryHouse } from "../../api/registry";
import { nameOf, placeOf, periodText, BINDEX_URL } from "../format";

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
          {item.status === "gone" && (
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

export default function RegistryHouse() {
  const { id } = useParams();
  const { locale, t } = useLocale();
  const [result, setResult] = useState({ id: null, data: null, failed: false });

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

  const { house, managements } = result.data;
  const now = managements.filter((m) => !m.ended_at);
  const past = managements.filter((m) => m.ended_at);

  const stats = [
    [t("registry.house.companies"), house.companies],
    [t("registry.house.units"), house.units || null],
    [t("registry.house.apartments"), house.apartments],
    [t("registry.house.floors"), house.floors],
    [t("registry.house.year"), house.year_built],
  ].filter(([, value]) => value !== null && value !== undefined);

  return (
    <section className="rg">
      <SEO
        title={t("registry.house.seoTitle", { address: house.address })}
        noindex
      />
      <div className="rg__inner">
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
          <a
            className="rg__ext"
            href={`${BINDEX_URL}/${locale}/address/${house.address_id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("registry.toBindexAddress")}
          </a>
        </div>

        {stats.length > 0 && (
          <div className="rg__stats">
            {stats.map(([label, value]) => (
              <div key={label} className="rg__stat">
                <span className="rg__tile-value">{value}</span>
                <span className="rg__tile-label">{label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="rg__section">
          <h2 className="rg__subtitle">{t("registry.house.now")}</h2>
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

        {past.length > 0 && (
          <div className="rg__section">
            <h2 className="rg__subtitle">{t("registry.house.history")}</h2>
            <div className="rg__rows">
              {past.map((m) => (
                <ManagementRow
                  key={`${m.bin}-${m.role}-${m.ended_at}`}
                  item={m}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
