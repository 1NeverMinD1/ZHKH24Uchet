import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryComplexes } from "../../api/registry";
import { formatNumber, pluralKey } from "../format";

export default function RegistryComplexes() {
  const { t } = useLocale();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const city = params.get("city") || "";
  const multi = params.get("multi") === "1";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const key = `${q}|${city}|${multi}|${page}`;

  const [input, setInput] = useState(q);
  const [cities, setCities] = useState([]);
  const [result, setResult] = useState({
    key: null,
    data: null,
    failed: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetchRegistryComplexes({ q, city, multi, page })
      .then((data) => {
        if (cancelled) return;
        setResult({ key, data, failed: false });
        if (Array.isArray(data.cities)) setCities(data.cities);
      })
      .catch(() => {
        if (!cancelled) setResult({ key, data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key, q, city, multi, page]);

  const loading = result.key !== key;
  const data = loading ? null : result.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const update = (next) => {
    const merged = { q, city, multi, page: 1, ...next };
    const out = {};
    if (merged.q) out.q = merged.q;
    if (merged.city) out.city = merged.city;
    if (merged.multi) out.multi = "1";
    if (merged.page > 1) out.page = String(merged.page);
    setParams(out);
  };

  return (
    <section className="rg">
      <SEO title={t("registry.complexes.seoTitle")} noindex />
      <div className="rg__inner">
        <h1 className="rg__title">{t("registry.complexes.title")}</h1>

        <form
          className="rg__search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: input.trim() });
          }}
        >
          <input
            className="rg__input"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("registry.complexes.placeholder")}
          />
          <button className="rg__button" type="submit">
            {t("registry.search")}
          </button>
        </form>

        <div className="rg__filters">
          <select
            className="rg__select"
            value={city}
            onChange={(e) => update({ city: e.target.value })}
          >
            <option value="">{t("registry.complexes.allCities")}</option>
            {cities.map((item) => (
              <option key={item.city} value={item.city}>
                {item.city} ({item.count})
              </option>
            ))}
          </select>

          <label className="rg__check">
            <input
              type="checkbox"
              checked={multi}
              onChange={(e) => update({ multi: e.target.checked })}
            />
            {t("registry.complexes.multi")}
          </label>
        </div>

        {loading && <p className="rg__status">{t("common.loading")}</p>}
        {!loading && result.failed && (
          <p className="rg__status">{t("registry.loadError")}</p>
        )}

        {data && (
          <>
            <p className="rg__status">
              {t("registry.found", { count: formatNumber(data.total) })}
            </p>

            {data.items.length === 0 ? (
              <p className="rg__status">
                {q || city || multi
                  ? t("registry.empty")
                  : t("registry.complexes.empty")}
              </p>
            ) : (
              <div className="rg__tiles">
                {data.items.map((cx) => (
                  <Link
                    key={cx.slug}
                    to={`/complex/${cx.slug}`}
                    className="rg__tile"
                  >
                    <span className="rg__card-title">{cx.name}</span>
                    {cx.city && (
                      <span className="rg__tile-label">{cx.city}</span>
                    )}
                    <span className="rg__tile-label">
                      {cx.houses}{" "}
                      {t(`registry.complexes.houses.${pluralKey(cx.houses)}`)}
                      {cx.apartments
                        ? ` · ${t("registry.complexes.apartments", { count: cx.apartments })}`
                        : ""}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {pages > 1 && (
              <div className="rg__pager">
                <button
                  type="button"
                  className="rg__button rg__button--ghost"
                  disabled={page <= 1}
                  onClick={() => update({ page: page - 1 })}
                >
                  {t("registry.prev")}
                </button>
                <span>{t("registry.page", { page, pages })}</span>
                <button
                  type="button"
                  className="rg__button rg__button--ghost"
                  disabled={page >= pages}
                  onClick={() => update({ page: page + 1 })}
                >
                  {t("registry.next")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
