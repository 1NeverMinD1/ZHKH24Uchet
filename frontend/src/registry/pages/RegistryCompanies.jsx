import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryCompanies } from "../../api/registry";
import { TYPES, nameOf, cityOf, formatNumber } from "../format";

export default function RegistryCompanies() {
  const { locale, t } = useLocale();
  const [params, setParams] = useSearchParams();
  const rawType = params.get("type");
  const type = TYPES.includes(rawType) ? rawType : "";
  const q = params.get("q") || "";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const key = `${type}|${q}|${page}`;

  const [input, setInput] = useState(q);
  const [result, setResult] = useState({
    key: null,
    data: null,
    failed: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetchRegistryCompanies({ type, q, page })
      .then((data) => {
        if (!cancelled) setResult({ key, data, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key, type, q, page]);

  const loading = result.key !== key;
  const data = loading ? null : result.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const update = (next) => {
    const merged = { type, q, page: 1, ...next };
    const out = {};
    if (merged.type) out.type = merged.type;
    if (merged.q) out.q = merged.q;
    if (merged.page > 1) out.page = String(merged.page);
    setParams(out);
  };

  return (
    <section className="rg">
      <SEO title={t("registry.companies.seoTitle")} noindex />
      <div className="rg__inner">
        <h1 className="rg__title">{t("registry.companies.title")}</h1>

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
            placeholder={t("registry.companies.placeholder")}
          />
          <button className="rg__button" type="submit">
            {t("registry.search")}
          </button>
        </form>

        <div className="rg__tabs">
          <button
            type="button"
            className={`rg__tab${type === "" ? " rg__tab--active" : ""}`}
            onClick={() => update({ type: "" })}
          >
            {t("registry.all")}
          </button>
          {TYPES.map((item) => (
            <button
              key={item}
              type="button"
              className={`rg__tab${type === item ? " rg__tab--active" : ""}`}
              onClick={() => update({ type: item })}
            >
              {t(`registry.typePlural.${item}`)}
            </button>
          ))}
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
              <div className="rg__list">
                {data.items.map((item) => (
                  <Link
                    key={item.bin}
                    to={`/company/${item.slug}`}
                    className="rg__card"
                  >
                    <div className="rg__card-main">
                      <div className="rg__card-meta">
                        <span
                          className={`rg__badge rg__badge--${item.zhkh_type}`}
                        >
                          {t(`registry.type.${item.zhkh_type}`)}
                        </span>
                        {item.status === "gone" && (
                          <span className="rg__badge rg__badge--gone">
                            {t("registry.status.gone")}
                          </span>
                        )}
                      </div>
                      <span className="rg__card-title">
                        {nameOf(item, locale)}
                      </span>
                      <div className="rg__card-meta">
                        <span>
                          {t("registry.bin")} {item.bin}
                        </span>
                        {cityOf(item, locale) && (
                          <span>{cityOf(item, locale)}</span>
                        )}
                      </div>
                    </div>
                    <div className="rg__card-side">
                      <div className="rg__num">{item.houses_current}</div>
                      <div className="rg__num-label">
                        {t("registry.housesNow")}
                      </div>
                      {item.houses_past > 0 && (
                        <div className="rg__num-label">
                          {t("registry.housesPast", {
                            count: item.houses_past,
                          })}
                        </div>
                      )}
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
