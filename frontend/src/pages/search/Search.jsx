import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import { shortName } from "../../utils/companyName";
import { pick } from "../../utils/localized";
import { formatDate } from "../../utils/dates";
import "./_Search.scss";
import "../companies/_Companies.scss";

const KINDS = ["director", "address"];

const compact = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== "" && value !== undefined && value !== null,
    ),
  );

export default function Search() {
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const [params, setParams] = useSearchParams();

  const q = (params.get("q") || "").trim();
  const changedKey = (params.get("changed") || "")
    .split(",")
    .filter((kind) => KINDS.includes(kind))
    .join(",");
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const region = params.get("region") || "";
  const district = params.get("district") || "";
  const historyMode = changedKey !== "";
  const key = JSON.stringify({ q, changedKey, from, to, region, district });

  const [result, setResult] = useState({
    key: null,
    items: [],
    total: 0,
    meta: null,
    page: 1,
    failed: false,
  });
  const [people, setPeople] = useState({ q: null, items: [] });
  const [snapshots, setSnapshots] = useState([]);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState({ region: "", list: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  const requestFor = (page) =>
    historyMode
      ? {
          url: "/history/changes",
          params: compact({
            q,
            changed: changedKey,
            from,
            to,
            region,
            district,
            page,
          }),
        }
      : {
          url: "/company-search",
          params: compact({ q, region, district, page }),
        };

  useEffect(() => {
    let cancelled = false;

    client
      .get("/history/snapshots")
      .then(({ data }) => {
        if (!cancelled) setSnapshots(data.data);
      })
      .catch(() => {});

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
    const request = requestFor(1);

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

  const toggleKind = (kind) => {
    const selected = new Set(changedKey ? changedKey.split(",") : []);
    if (selected.has(kind)) {
      selected.delete(kind);
    } else {
      selected.add(kind);
    }
    update({ changed: KINDS.filter((item) => selected.has(item)).join(",") });
  };

  const resetFilters = () =>
    update({ changed: "", from: "", to: "", region: "", district: "" });

  const handleLoadMore = async () => {
    const requestKey = key;
    const page = result.page + 1;
    const request = requestFor(page);
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
  const districtList = districts.region === region ? districts.list : [];
  const lastSnapshot = snapshots[snapshots.length - 1];
  const defaultTo = lastSnapshot ? lastSnapshot.takenOn : "";
  const defaultFrom =
    snapshots.length > 1 ? snapshots[snapshots.length - 2].takenOn : defaultTo;
  const hasFilters = historyMode || region !== "";

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

  const filters = (
    <div className="filters">
      <div className="filters__row">
        <label className="filters__check">
          <input
            type="checkbox"
            checked={changedKey.split(",").includes("director")}
            onChange={() => toggleKind("director")}
          />
          {t("history.directorChanged")}
        </label>
        <label className="filters__check">
          <input
            type="checkbox"
            checked={changedKey.split(",").includes("address")}
            onChange={() => toggleKind("address")}
          />
          {t("history.addressChanged")}
        </label>
      </div>

      <div className="filters__row">
        <label className="filters__field">
          {t("history.from")}
          <select
            className="filters__select"
            value={from || defaultFrom}
            disabled={!historyMode || snapshots.length < 2}
            onChange={(e) => update({ from: e.target.value })}
          >
            {snapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.takenOn}>
                {formatDate(snapshot.takenOn)}
              </option>
            ))}
          </select>
        </label>

        <label className="filters__field">
          {t("history.to")}
          <select
            className="filters__select"
            value={to || defaultTo}
            disabled={!historyMode || snapshots.length < 2}
            onChange={(e) => update({ to: e.target.value })}
          >
            {snapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.takenOn}>
                {formatDate(snapshot.takenOn)}
              </option>
            ))}
          </select>
        </label>

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

        {hasFilters && (
          <button
            className="filters__reset"
            type="button"
            onClick={resetFilters}
          >
            {t("history.reset")}
          </button>
        )}
      </div>

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
    </div>
  );

  let content;

  if (!q) {
    content = <p className="search__message">{t("search.hint")}</p>;
  } else if (result.key !== key) {
    content = (
      <>
        <h1 className="search__title">{t("search.title", { q })}</h1>
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
              <Link
                key={item.bin}
                to={`/company/${item.bin}`}
                className="change"
              >
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
              </Link>
            ))}

          {!historyMode &&
            result.items.map((item) => {
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
