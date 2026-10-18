import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import { shortName } from "../../utils/companyName";
import { pick } from "../../utils/localized";
import "./_Search.scss";

export default function Search() {
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const [result, setResult] = useState({ q: null, items: [], failed: false });

  useEffect(() => {
    if (!q) return;
    let cancelled = false;

    client
      .get("/company-search", { params: { q } })
      .then(({ data }) => {
        if (cancelled) return;
        setResult({ q, items: data.data, failed: false });
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ q, items: [], failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [q]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("q") || "").trim();
    if (!value) return;
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  let content;

  if (!q) {
    content = <p className="search__message">{t("search.hint")}</p>;
  } else if (result.q !== q) {
    content = <p className="search__message">{t("search.loading")}</p>;
  } else {
    content = (
      <>
        <h1 className="search__title">{t("search.title", { q })}</h1>

        {result.failed && (
          <p className="search__message">{t("search.error")}</p>
        )}

        {!result.failed && result.items.length === 0 && (
          <p className="search__message">{t("search.empty")}</p>
        )}

        <div className="search__list">
          {result.items.map((item) => {
            const locality = pick(item, "locality", locale);
            return (
              <Link
                key={item.bin}
                to={`/company/${item.bin}`}
                className="search__item"
              >
                <div>
                  <p className="search__item-name">
                    {shortName(pick(item, "name", locale))}
                  </p>
                  <p className="search__item-meta">
                    {t("company.bin")} {item.bin}
                    {locality ? ` · ${locality}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <section className="search">
      <SEO
        title={q ? t("search.seoTitle", { q }) : t("search.seoTitleEmpty")}
        noindex
      />
      <div className="search__inner">
        <form className="search__form" onSubmit={handleSubmit}>
          <input
            key={q}
            className="search__input"
            type="text"
            name="q"
            defaultValue={q}
            placeholder={t("search.placeholder")}
          />
          <button className="search__button" type="submit">
            {t("search.button")}
          </button>
        </form>

        {content}
      </div>
    </section>
  );
}
