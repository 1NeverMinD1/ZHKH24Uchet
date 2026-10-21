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
import "../companies/_Companies.scss";

export default function Search() {
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const region = params.get("region") || "";
  const district = params.get("district") || "";
  const key = JSON.stringify({ q, region, district });

  const [result, setResult] = useState({
    key: null,
    items: [],
    total: 0,
    page: 1,
    failed: false,
  });
  const [people, setPeople] = useState({ q: null, items: [] });
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState({ region: "", list: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  const requestParams = (page) => {
    const result = { q, page };
    if (region) result.region = region;
    if (district) result.district = district;
    return result;
  };

  useEffect(() => {
    let cancelled = false;

    client
      .get("/history/territories")
      .then(({ data }) => {
        if (!cancelled) setRegions(data.data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!region) return;
    let cancelled = false;

    client
      .get("/history/territories", { params: { parent: region } })
      .then(({ data }) => {
        if (!cancelled) setDistricts({ region, list: data.data });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [region]);

  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    const requestKey = key;

    client
      .get("/company-search", { params: requestParams(1) })
      .then(({ data }) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          items: data.data,
          total: data.meta.total,
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
          page: 1,
          failed: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

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

  const handleLoadMore = async () => {
    const requestKey = key;
    const page = result.page + 1;
    setLoadingMore(true);
    setMoreFailed(false);

    try {
      const { data } = await client.get("/company-search", {
        params: requestParams(page),
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
    const next = new URLSearchParams();
    next.set("q", value);
    if (region) next.set("region", region);
    if (district) next.set("district", district);
    navigate(`/search?${next.toString()}`);
  };

  const directors = people.q === q ? people.items : [];
  const districtList = districts.region === region ? districts.list : [];

  const filters = (
    <div className="filters">
      <div className="filters__row">
        <label className="filters__field">
          {t("history.region")}
          <select
            className="filters__select"
            value={region}
            onChange={(e) => update({ region: e.target.value, district: "" })}
          >
            <option value="">{t("history.regionAll")}</option>
            {regions.map((item) => (
              <option key={item.kato} value={item.kato.slice(0, 2)}>
                {pick(item, "name", locale)}
              </option>
            ))}
          </select>
        </label>

        <label className="filters__field">
          {t("history.district")}
          <select
            className="filters__select"
            value={district}
            disabled={!region}
            onChange={(e) => update({ district: e.target.value })}
          >
            <option value="">{t("history.districtAll")}</option>
            {districtList.map((item) => (
              <option key={item.kato} value={item.kato.slice(0, 4)}>
                {pick(item, "name", locale)}
              </option>
            ))}
          </select>
        </label>

        {region && (
          <button
            className="filters__reset"
            type="button"
            onClick={() => update({ region: "", district: "" })}
          >
            {t("history.reset")}
          </button>
        )}
      </div>
    </div>
  );

  let content;

  if (!q) {
    content = <p className="search__message">{t("search.hint")}</p>;
  } else if (result.key !== key) {
    content = (
      <>
        {filters}
        <p className="search__message">{t("search.loading")}</p>
      </>
    );
  } else {
    content = (
      <>
        <h1 className="search__title">{t("search.title", { q })}</h1>

        {filters}

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
          <p className="search__message">{t("search.error")}</p>
        )}

        {!result.failed &&
          result.items.length === 0 &&
          directors.length === 0 && (
            <p className="search__message">{t("search.empty")}</p>
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

        {moreFailed && (
          <p className="search__message">{t("companies.moreError")}</p>
        )}

        {result.items.length < result.total && (
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
