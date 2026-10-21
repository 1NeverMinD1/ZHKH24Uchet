import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import Breadcrumbs from "../../components/breadcrumbs/Breadcrumbs";
import { Link } from "../../i18n/router";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import { shortName } from "../../utils/companyName";
import { pick } from "../../utils/localized";
import { formatDate } from "../../utils/dates";
import "../search/_Search.scss";
import "./_Companies.scss";

const KINDS = ["director", "address"];

const compact = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== "" && value !== undefined && value !== null,
    ),
  );

const requestFor = (query, page) =>
  query.changed
    ? { url: "/history/changes", params: { ...query, page } }
    : {
        url: "/company-list",
        params: compact({
          page,
          region: query.region,
          district: query.district,
        }),
      };

export default function Companies() {
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const [params, setParams] = useSearchParams();

  const changedKey = (params.get("changed") || "")
    .split(",")
    .filter((kind) => KINDS.includes(kind))
    .join(",");
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const region = params.get("region") || "";
  const district = params.get("district") || "";
  const historyMode = changedKey !== "";

  const query = useMemo(
    () => compact({ changed: changedKey, from, to, region, district }),
    [changedKey, from, to, region, district],
  );
  const key = JSON.stringify(query);

  const [snapshots, setSnapshots] = useState([]);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState({ region: "", list: [] });
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

    client
      .get("/history/snapshots")
      .then(({ data: response }) => {
        if (!cancelled) setSnapshots(response.data);
      })
      .catch(() => {});

    client
      .get("/history/territories")
      .then(({ data: response }) => {
        if (!cancelled) setRegions(response.data);
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
      .then(({ data: response }) => {
        if (!cancelled) setDistricts({ region, list: response.data });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [region]);

  useEffect(() => {
    let cancelled = false;
    const requestKey = JSON.stringify(query);
    const request = requestFor(query, 1);

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
  }, [query]);

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

  const handleLoadMore = async () => {
    const page = data.page + 1;
    const request = requestFor(query, page);
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
  const districtList = districts.region === region ? districts.list : [];
  const lastSnapshot = snapshots[snapshots.length - 1];
  const defaultTo = lastSnapshot ? lastSnapshot.takenOn : "";
  const defaultFrom =
    snapshots.length > 1 ? snapshots[snapshots.length - 2].takenOn : defaultTo;
  const filtered = historyMode || region !== "";
  const testNotice = data.meta?.base?.isTest || data.meta?.end?.isTest;

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

  const optionLabel = (snapshot) =>
    `${formatDate(snapshot.takenOn)}${
      snapshot.isTest ? ` (${t("history.snapshotTest")})` : ""
    }`;

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

        <div className="filters">
          <p className="filters__title">{t("history.filtersTitle")}</p>

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
                    {optionLabel(snapshot)}
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
                    {optionLabel(snapshot)}
                  </option>
                ))}
              </select>
            </label>

            <label className="filters__field">
              {t("history.region")}
              <select
                className="filters__select"
                value={region}
                onChange={(e) =>
                  update({ region: e.target.value, district: "" })
                }
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

            {(historyMode || region) && (
              <button
                className="filters__reset"
                type="button"
                onClick={() => setParams({}, { replace: true })}
              >
                {t("history.reset")}
              </button>
            )}
          </div>

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
        </div>

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

          {!loading &&
            !historyMode &&
            data.items.map((item) => {
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

        {!loading && data.items.length < data.total && (
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
