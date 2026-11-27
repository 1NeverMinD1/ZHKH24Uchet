import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryComplex } from "../../api/registry";
import { TYPES, nameOf, placeOf } from "../format";
import ComplexPassport from "../ComplexPassport";

function Status({ text }) {
  return (
    <section className="rg">
      <div className="rg__inner">
        <p className="rg__status">{text}</p>
      </div>
    </section>
  );
}

export default function RegistryComplex() {
  const { slug } = useParams();
  const { locale, t } = useLocale();
  const [result, setResult] = useState({
    slug: null,
    data: null,
    failed: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetchRegistryComplex(slug)
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

  const { complex, houses } = result.data;
  const byRole = {};
  houses
    .filter((h) => h.manager)
    .forEach((h) => {
      byRole[h.manager.role] = byRole[h.manager.role] || new Set();
      byRole[h.manager.role].add(h.manager.bin);
    });

  const stats = [
    [t("registry.complex.houses"), houses.length || null],
    [t("registry.complex.apartments"), complex.apartments],
    ...TYPES.filter((role) => byRole[role]).map((role) => [
      t(`registry.typePlural.${role}`),
      byRole[role].size,
    ]),
  ].filter(([, value]) => value !== null && value !== undefined);

  return (
    <section className="rg">
      <SEO
        title={t("registry.complex.seoTitle", { name: complex.name })}
        noindex
      />
      <div className="rg__inner">
        <div className="rg__head">
          <h1 className="rg__name">
            {t("registry.complexLabel", { name: complex.name })}
          </h1>
          {complex.city && (
            <span className="rg__card-meta">{complex.city}</span>
          )}
          {complex.description && (
            <p className="rg__lead">{complex.description}</p>
          )}
        </div>

        <div className="rg__stats">
          {stats.map(([label, value]) => (
            <div key={label} className="rg__stat">
              <span className="rg__tile-value">{value}</span>
              <span className="rg__tile-label">{label}</span>
            </div>
          ))}
        </div>

        {complex.passport && (
          <div className="rg__section">
            <ComplexPassport passport={complex.passport} />
          </div>
        )}

        {houses.length > 0 && (
          <div className="rg__section">
            <h2 className="rg__subtitle">
              {t("registry.complex.housesTitle")}
            </h2>
            <div className="rg__rows">
              {houses.map((h) => (
                <Link
                  key={h.address_id}
                  to={`/house/${h.address_id}`}
                  className="rg__row"
                >
                  <div className="rg__row-main">
                    <span className="rg__row-title">{h.address}</span>
                    {placeOf(h, locale) && (
                      <span className="rg__card-meta">
                        {placeOf(h, locale)}
                      </span>
                    )}
                    <span className="rg__row-manager">
                      {h.manager ? (
                        <>
                          <span
                            className={`rg__badge rg__badge--${h.manager.role}`}
                          >
                            {t(`registry.type.${h.manager.role}`)}
                          </span>
                          <span>{nameOf(h.manager, locale)}</span>
                        </>
                      ) : (
                        <span>{t("registry.houses.noManager")}</span>
                      )}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
