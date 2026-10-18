import { useEffect, useState } from "react";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import Breadcrumbs from "../../components/breadcrumbs/Breadcrumbs";
import { Link } from "../../i18n/router";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import { shortName } from "../../utils/companyName";
import { pick } from "../../utils/localized";
import "../search/_Search.scss";

export default function Companies() {
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorKey, setErrorKey] = useState("");

  useEffect(() => {
    let cancelled = false;

    client
      .get("/company-list", { params: { page: 1 } })
      .then(({ data }) => {
        if (cancelled) return;
        setItems(data.data);
        setTotal(data.meta.total);
      })
      .catch(() => {
        if (cancelled) return;
        setErrorKey("companies.loadError");
      })
      .finally(() => {
        if (cancelled) return;
        setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadMore = async () => {
    const next = page + 1;
    setLoadingMore(true);
    setErrorKey("");

    try {
      const { data } = await client.get("/company-list", {
        params: { page: next },
      });
      setItems((prev) => [...prev, ...data.data]);
      setTotal(data.meta.total);
      setPage(next);
    } catch {
      setErrorKey("companies.moreError");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("q") || "").trim();
    if (!value) return;
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  const seo = (
    <SEO
      title={t("companies.seoTitle")}
      description={t("companies.seoDescription")}
    />
  );

  if (initialLoading) {
    return (
      <section className="search">
        {seo}
        <div className="search__inner">
          <p className="search__message">{t("common.loading")}</p>
        </div>
      </section>
    );
  }

  const crumbs = [
    { name: t("breadcrumbs.home"), path: "/" },
    { name: t("companies.title"), path: "/companies" },
  ];

  return (
    <section className="search">
      {seo}
      <div className="search__inner">
        <Breadcrumbs items={crumbs} />
        <h1 className="search__title">{t("companies.title")}</h1>

        <form className="search__form" onSubmit={handleSubmit}>
          <input
            className="search__input"
            type="text"
            name="q"
            placeholder={t("search.placeholder")}
          />
          <button className="search__button" type="submit">
            {t("search.button")}
          </button>
        </form>

        {errorKey && <p className="search__message">{t(errorKey)}</p>}

        {!errorKey && items.length === 0 && (
          <p className="search__message">{t("companies.empty")}</p>
        )}

        <div className="search__list">
          {items.map((item) => {
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

        {items.length < total && (
          <button
            className="search__more"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? t("common.loading") : t("companies.more")}
          </button>
        )}
      </div>
    </section>
  );
}
