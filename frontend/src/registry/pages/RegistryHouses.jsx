import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryHouses } from "../../api/registry";
import { nameOf, placeOf, formatNumber } from "../format";

const MANAGED = ["", "yes", "no"];

export default function RegistryHouses() {
  const { locale, t } = useLocale();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const city = params.get("city") || "";
  const rawManaged = params.get("managed") || "";
  const managed = MANAGED.includes(rawManaged) ? rawManaged : "";
  const complex = params.get("complex") === "1";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const key = `${q}|${city}|${managed}|${complex}|${page}`;

  const [input, setInput] = useState(q);
  const [cities, setCities] = useState([]);
  const [result, setResult] = useState({
    key: null,
    data: null,
    failed: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetchRegistryHouses({ q, city, managed, complex, page })
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
  }, [key, q, city, managed, complex, page]);

  const loading = result.key !== key;
  const data = loading ? null : result.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const update = (next) => {
    const merged = { q, city, managed, complex, page: 1, ...next };
    const out = {};
    if (merged.q) out.q = merged.q;
    if (merged.city) out.city = merged.city;
    if (merged.managed) out.managed = merged.managed;
    if (merged.complex) out.complex = "1";
    if (merged.page > 1) out.page = String(merged.page);
    setParams(out);
  };

  return (
    <section className="rg">
      <SEO title={t("registry.houses.seoTitle")} noindex />
      <div className="rg__inner">
        <h1 className="rg__title">{t("registry.houses.title")}</h1>

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
            placeholder={t("registry.houses.placeholder")}
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
            <option value="">{t("registry.houses.allCities")}</option>
            {cities.map((item) => (
              <option key={item.city} value={item.city}>
                {item.city} ({formatNumber(item.count)})
              </option>
            ))}
          </select>

          <select
            className="rg__select"
            value={managed}
            onChange={(e) => update({ managed: e.target.value })}
          >
            {MANAGED.map((item) => (
              <option key={item || "all"} value={item}>
                {t(`registry.houses.managed.${item || "all"}`)}
              </option>
            ))}
          </select>

          <label className="rg__check">
            <input
              type="checkbox"
              checked={complex}
              onChange={(e) => update({ complex: e.target.checked })}
            />
            {t("registry.houses.inComplex")}
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
              <p className="rg__status">{t("registry.empty")}</p>
            ) : (
              <div className="rg__rows">
                {data.items.map((h) => (
                  <Link
                    key={h.address_id}
                    to={`/house/${h.address_id}`}
                    className="rg__row"
                  >
                    <div className="rg__row-main">
                      <span className="rg__row-title">{h.address}</span>
                      <span className="rg__card-meta">
                        {placeOf(h, locale) && (
                          <span>{placeOf(h, locale)}</span>
                        )}
                        {h.complex_name && (
                          <span>
                            {t("registry.complexLabel", {
                              name: h.complex_name,
                            })}
                          </span>
                        )}
                      </span>
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
