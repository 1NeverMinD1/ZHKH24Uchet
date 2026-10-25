import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import CompanyLink from "../../components/company/CompanyLink";
import CompanyFilters from "../../components/filters/CompanyFilters";
import {
  FILTER_KEYS,
  listParams,
  readFilters,
} from "../../utils/companyFilters";
import { Link } from "../../i18n/router";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import { shortName } from "../../utils/companyName";
import { pick } from "../../utils/localized";
import { formatDate } from "../../utils/dates";
import "./_Search.scss";
import "../companies/_Companies.scss";

const requestFor = (q, filters, page) =>
  filters.changed
    ? { url: "/history/changes", params: { q, ...filters, page } }
    : {
        url: "/company-search",
        params: { q, ...listParams(filters), page },
      };

export default function Search() {
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const [params, setParams] = useSearchParams();

  const q = (params.get("q") || "").trim();
  const filters = readFilters(params);
  const historyMode = Boolean(filters.changed);
  const key = JSON.stringify({ q, filters });

  const [result, setResult] = useState({
    key: null,
    items: [],
    total: 0,
    meta: null,
    page: 1,
    failed: false,
  });
  const [people, setPeople] = useState({ q: null, items: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    const requestKey = key;
    const parsed = JSON.parse(requestKey);
    const request = requestFor(parsed.q, parsed.filters, 1);

    client
      .get(request.url, { params: request.params })
      .then(({ data }) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          items: data.data,
          total: data.meta.total,
          meta: data.meta,
          page: 1,
          failed: false,
        });
        setMoreFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setResult({
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
  }, [key, q]);

  useEffect(() => {
    if (q.length < 4 || /^\d+$/.test(q)) return;
    let cancelled = false;

    client
      .get("/history/directors", { params: { q, limit: 5 } })
      .then(({ data }) => {
        if (!cancelled) setPeople({ q, items: data.data });
      })
      .catch(() => {
        if (!cancelled) setPeople({ q, items: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [q]);

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

  const resetFilters = () =>
    update(Object.fromEntries(FILTER_KEYS.map((name) => [name, ""])));

  const handleLoadMore = async () => {
    const requestKey = key;
    const page = result.page + 1;
    const request = requestFor(q, filters, page);
    setLoadingMore(true);
    setMoreFailed(false);

    try {
      const { data } = await client.get(request.url, {
        params: request.params,
      });
      setResult((previous) =>
        previous.key === requestKey
          ? {
              ...previous,
              items: [...previous.items, ...data.data],
              total: data.meta.total,
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
    const next = new URLSearchParams(params);
    next.set("q", value);
    navigate(`/search?${next.toString()}`);
  };

  const directors = people.q === q ? people.items : [];
  const canLoadMore =
    result.items.length < result.total &&
    result.page < (result.meta?.maxPage ?? Infinity);

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

  const filterBlock = (
    <>
      <CompanyFilters
        filters={filters}
        update={update}
        onReset={resetFilters}
      />
      {historyMode && result.key === key && result.meta?.base && (
        <div className="filters__summary">
          <p>
            {t("history.compare", {
              from: formatDate(result.meta.base.takenOn),
              to: formatDate(result.meta.end?.takenOn),
            })}
          </p>
        </div>
      )}
    </>
  );

  let content;

  if (!q) {
    content = <p className="search__message">{t("search.hint")}</p>;
  } else if (result.key !== key) {
    content = (
      <>
        <h1 className="search__title">{t("search.title", { q })}</h1>
        {filterBlock}
        <p className="search__message">{t("search.loading")}</p>
      </>
    );
  } else {
    content = (
      <>
        <h1 className="search__title">{t("search.title", { q })}</h1>

        {filterBlock}

        {directors.length > 0 && (
          <div className="search__people">
            <h2 className="search__subtitle">{t("search.directors")}</h2>
            <div className="search__list">
              {directors.map((person) => (
                <Link
                  key={person.id}
                  to={`/director/${person.id}`}
                  className="search__item"
                >
                  <div>
                    <p className="search__item-name">{person.name}</p>
                    <p className="search__item-meta">
                      {t("search.directorCompanies", {
                        count: person.companies,
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {result.failed && (
          <p className="search__message">
            {historyMode ? t("history.loadError") : t("search.error")}
          </p>
        )}

        {!result.failed &&
          result.items.length === 0 &&
          (historyMode || directors.length === 0) && (
            <p className="search__message">
              {historyMode ? t("history.empty") : t("search.empty")}
            </p>
          )}

        {!result.failed && result.total > 0 && (
          <div className="search__head">
            <h2 className="search__subtitle">{t("companies.title")}</h2>
            <p className="search__count">
              {t("history.found", {
                count: result.total.toLocaleString("ru-RU"),
              })}
            </p>
          </div>
        )}

        <div className="search__list">
          {historyMode &&
            result.items.map((item) => (
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

          {!historyMode &&
            result.items.map((item) => {
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
