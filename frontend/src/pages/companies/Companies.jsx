import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import Breadcrumbs from "../../components/breadcrumbs/Breadcrumbs";
import CompanyLink from "../../components/company/CompanyLink";
import CompanyFilters from "../../components/filters/CompanyFilters";
import { listParams, readFilters } from "../../utils/companyFilters";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import { shortName } from "../../utils/companyName";
import { pick } from "../../utils/localized";
import { formatDate } from "../../utils/dates";
import "../search/_Search.scss";
import "./_Companies.scss";

const requestFor = (filters, page) =>
  filters.changed
    ? { url: "/history/changes", params: { ...filters, page } }
    : { url: "/company-list", params: { ...listParams(filters), page } };

export default function Companies() {
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const [params, setParams] = useSearchParams();

  const filters = readFilters(params);
  const key = JSON.stringify(filters);
  const historyMode = Boolean(filters.changed);

  const [data, setData] = useState({
    key: null,
    items: [],
    total: 0,
    meta: null,
    page: 1,
    failed: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const requestKey = key;
    const request = requestFor(JSON.parse(requestKey), 1);

    client
      .get(request.url, { params: request.params })
      .then(({ data: response }) => {
        if (cancelled) return;
        setData({
          key: requestKey,
          items: response.data,
          total: response.meta.total,
          meta: response.meta,
          page: 1,
          failed: false,
        });
        setMoreFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setData({
          key: requestKey,
          items: [],
          total: 0,
          meta: null,
          page: 1,
          failed: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries(patch)) {
      if (value) {
        next.set(name, value);
      } else {
        next.delete(name);
      }
    }
    setParams(next, { replace: true });
  };

  const handleLoadMore = async () => {
    const page = data.page + 1;
    const request = requestFor(filters, page);
    setLoadingMore(true);
    setMoreFailed(false);

    try {
      const { data: response } = await client.get(request.url, {
        params: request.params,
      });
      setData((previous) =>
        previous.key === key
          ? {
              ...previous,
              items: [...previous.items, ...response.data],
              total: response.meta.total,
              page,
            }
          : previous,
      );
    } catch {
      setMoreFailed(true);
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

  const loading = data.key !== key;
  const filtered = Object.keys(filters).length > 0;
  const testNotice = data.meta?.base?.isTest || data.meta?.end?.isTest;
  const canLoadMore =
    !loading &&
    data.items.length < data.total &&
    data.page < (data.meta?.maxPage ?? Infinity);

  const crumbs = [
    { name: t("breadcrumbs.home"), path: "/" },
    { name: t("companies.title"), path: "/companies" },
  ];

  const nameOf = (item) =>
    shortName(
      (locale === "kk"
        ? item.nameKk || item.nameRu
        : item.nameRu || item.nameKk) || "",
    ) || item.bin;

  const addressOf = (address) => {
    if (!address) return t("history.nobody");
    const place = locale === "kk" ? address.placeKk : address.place;
    return [address.text, place].filter(Boolean).join(", ");
  };

  return (
    <section className="search">
      <SEO
        title={t("companies.seoTitle")}
        description={t("companies.seoDescription")}
      />
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

        <CompanyFilters
          filters={filters}
          update={update}
          onReset={() => setParams({}, { replace: true })}
        />

        {historyMode && data.meta && !loading && (
          <div className="filters__summary">
            <p>
              {t("history.compare", {
                from: formatDate(data.meta.base?.takenOn),
                to: formatDate(data.meta.end?.takenOn),
              })}
            </p>
            {testNotice && (
              <p className="filters__notice">{t("history.testNotice")}</p>
            )}
          </div>
        )}

        {filtered && !loading && !data.failed && data.total > 0 && (
          <p className="filters__count">
            {t("history.found", { count: data.total.toLocaleString("ru-RU") })}
          </p>
        )}

        {loading && <p className="search__message">{t("common.loading")}</p>}

        {!loading && data.failed && (
          <p className="search__message">
            {historyMode ? t("history.loadError") : t("companies.loadError")}
          </p>
        )}

        {!loading && !data.failed && data.items.length === 0 && (
          <p className="search__message">
            {historyMode ? t("history.empty") : t("companies.empty")}
          </p>
        )}

        <div className="search__list">
          {!loading &&
            historyMode &&
            data.items.map((item) => (
              <CompanyLink key={item.bin} slug={item.slug} className="change">
                <p className="change__name">{nameOf(item)}</p>
                <p className="change__meta">
                  {t("company.bin")} {item.bin}
                </p>

                {item.changes.includes("director") && (
                  <p className="change__line">
                    <span className="change__tag">{t("history.director")}</span>
                    <span className="change__was">
                      {item.director.from?.name || t("history.nobody")}
                    </span>
                    <span className="change__arrow">→</span>
                    <span>{item.director.to?.name || t("history.nobody")}</span>
                  </p>
                )}

                {item.changes.includes("address") && (
                  <p className="change__line">
                    <span className="change__tag">{t("history.address")}</span>
                    <span className="change__was">
                      {addressOf(item.address.from)}
                    </span>
                    <span className="change__arrow">→</span>
                    <span>{addressOf(item.address.to)}</span>
                  </p>
                )}
              </CompanyLink>
            ))}

          {!loading &&
            !historyMode &&
            data.items.map((item) => {
              const locality = pick(item, "locality", locale);
              return (
                <CompanyLink
                  key={item.bin}
                  slug={item.slug}
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
                </CompanyLink>
              );
            })}
        </div>

        {moreFailed && (
          <p className="search__message">{t("companies.moreError")}</p>
        )}

        {canLoadMore && (
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
