import { useEffect, useState } from "react";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryComplexes } from "../../api/registry";

export default function RegistryComplexes() {
  const { t } = useLocale();
  const [result, setResult] = useState({
    done: false,
    items: [],
    failed: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetchRegistryComplexes()
      .then((data) => {
        if (!cancelled)
          setResult({ done: true, items: data.items, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ done: true, items: [], failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rg">
      <SEO title={t("registry.complexes.seoTitle")} noindex />
      <div className="rg__inner">
        <h1 className="rg__title">{t("registry.complexes.title")}</h1>

        {!result.done && <p className="rg__status">{t("common.loading")}</p>}
        {result.done && result.failed && (
          <p className="rg__status">{t("registry.loadError")}</p>
        )}
        {result.done && !result.failed && result.items.length === 0 && (
          <p className="rg__status">{t("registry.complexes.empty")}</p>
        )}

        {result.items.length > 0 && (
          <div className="rg__tiles">
            {result.items.map((cx) => (
              <Link
                key={cx.slug}
                to={`/complex/${cx.slug}`}
                className="rg__tile"
              >
                <span className="rg__card-title">{cx.name}</span>
                {cx.city && <span className="rg__tile-label">{cx.city}</span>}
                <span className="rg__tile-label">
                  {cx.houses} {t("registry.complexes.houses")}
                  {cx.apartments
                    ? ` · ${t("registry.complexes.apartments", { count: cx.apartments })}`
                    : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
