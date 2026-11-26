import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryHouses } from "../../api/registry";
import { nameOf, placeOf, formatNumber } from "../format";

export default function RegistryHouses() {
  const { locale, t } = useLocale();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const key = `${q}|${page}`;

  const [input, setInput] = useState(q);
  const [result, setResult] = useState({
    key: null,
    data: null,
    failed: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetchRegistryHouses({ q, page })
      .then((data) => {
        if (!cancelled) setResult({ key, data, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key, q, page]);

  const loading = result.key !== key;
  const data = loading ? null : result.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const update = (next) => {
    const merged = { q, page: 1, ...next };
    const out = {};
    if (merged.q) out.q = merged.q;
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
