import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import Breadcrumbs from "../../components/breadcrumbs/Breadcrumbs";
import CompanyLink from "../../components/company/CompanyLink";
import NotFound from "../notfound/NotFound";
import { useLocale } from "../../i18n/context";
import { shortName } from "../../utils/companyName";
import { formatDate } from "../../utils/dates";
import { unitName } from "../../utils/units";
import CompaniesChart from "../../components/history/CompaniesChart";
import "../search/_Search.scss";
import "./_Address.scss";

const UNITS_PREVIEW = 12;

const pluralIndex = (n) => {
  const last = n % 10;
  const tens = n % 100;
  if (last === 1 && tens !== 11) return 0;
  if (last >= 2 && last <= 4 && (tens < 12 || tens > 14)) return 1;
  return 2;
};

const plural = (template, count) => {
  const forms = template.split("|");
  return (forms[pluralIndex(count)] ?? forms[0]).replace(
    "#",
    count.toLocaleString("ru-RU"),
  );
};

export default function Address() {
  const { id } = useParams();
  const { locale, t } = useLocale();
  const validId = /^\d+$/.test(id);
  const [date, setDate] = useState("");
  const [unit, setUnit] = useState("");
  const [showAllUnits, setShowAllUnits] = useState(false);
  const [data, setData] = useState({
    key: null,
    info: null,
    companies: [],
    total: 0,
    page: 1,
    status: "ok",
  });
  const [loadingMore, setLoadingMore] = useState(false);

  const key = `${id}|${date}|${unit}`;

  const paramsOf = (extra = {}) => {
    const params = { ...extra };
    if (date) params.date = date;
    if (unit) params.unit = unit;
    return params;
  };

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    const requestKey = `${id}|${date}|${unit}`;
    const params = {};
    if (date) params.date = date;
    if (unit) params.unit = unit;

    client
      .get(`/history/address/${id}`, { params })
      .then(({ data: response }) => {
        if (cancelled) return;
        const info = response.data;
        setData({
          key: requestKey,
          info,
          companies: info.companies,
          total: info.companiesTotal,
          page: 1,
          status: "ok",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setData({
          key: requestKey,
          info: null,
          companies: [],
          total: 0,
          page: 1,
          status: error.response?.status === 404 ? "notfound" : "error",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [id, date, unit, validId]);

  const handleLoadMore = async () => {
    const page = data.page + 1;
    setLoadingMore(true);

    try {
      const { data: response } = await client.get(`/history/address/${id}`, {
        params: paramsOf({ page }),
      });
      setData((previous) =>
        previous.key === key
          ? {
              ...previous,
              companies: [...previous.companies, ...response.data.companies],
              page,
            }
          : previous,
      );
    } catch {
      setLoadingMore(false);
      return;
    }

    setLoadingMore(false);
  };

  if (!validId || data.status === "notfound") {
    return (
      <NotFound
        title={t("address.notFound")}
        text={t("address.notFoundText")}
      />
    );
  }

  if (data.key !== key) {
    return (
      <section className="search">
        <SEO title={t("address.title")} noindex />
        <div className="search__inner">
          <p className="search__message">{t("common.loading")}</p>
        </div>
      </section>
    );
  }

  if (data.status === "error" || !data.info) {
    return (
      <section className="search">
        <SEO title={t("address.title")} noindex />
        <div className="search__inner">
          <p className="search__message">{t("address.loadError")}</p>
        </div>
      </section>
    );
  }

  const { info } = data;
  const place = locale === "kk" ? info.placeKk || info.place : info.place;
  const timeline = info.timeline;
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  const difference = last.companies - first.companies;
  const selected = date || info.snapshot?.takenOn || "";
  const canLoadMore =
    data.companies.length < data.total &&
    data.page < (info.maxPage ?? Infinity);
  const units = info.units || [];
  const shownUnits = showAllUnits ? units : units.slice(0, UNITS_PREVIEW);
  const selectedMissing =
    unit && unit !== "none" && !units.some((item) => String(item.id) === unit);

  const crumbs = [
    { name: t("breadcrumbs.home"), path: "/" },
    { name: t("companies.title"), path: "/companies" },
    { name: info.text, path: `/address/${info.id}` },
  ];

  const summaryText = (() => {
    const s = info.summary;
    if (!s) return "";
    const where = t("address.summary.whereNoPlace", { address: info.text });
    const now =
      s.now > 0
        ? plural(t("address.summary.now"), s.now) +
          (s.units > 0 ? plural(t("address.summary.units"), s.units) : "")
        : t("address.summary.nowEmpty");
    const sentences = [`${where} ${now}.`];
    if (s.ever > s.now) {
      sentences.push(
        `${plural(t("address.summary.ever", { year: s.since }), s.ever)}.`,
      );
    }
    const changes = [];
    if (s.appeared > 0) {
      changes.push(plural(t("address.summary.appeared"), s.appeared));
    }
    if (s.left > 0) {
      changes.push(plural(t("address.summary.left"), s.left));
    }
    const period = t(
      s.fullYear ? "address.summary.fullYear" : "address.summary.sinceYear",
      { year: s.year },
    );
    sentences.push(
      `${period} ${changes.length > 0 ? changes.join(", ") : t("address.summary.noChanges")}.`,
    );
    return sentences.join(" ");
  })();

  const nameOf = (item) =>
    shortName(
      (locale === "kk"
        ? item.nameKk || item.nameRu
        : item.nameRu || item.nameKk) || "",
    ) || item.bin;

  return (
    <section className="search">
      <SEO
        title={t("address.seoTitle", { address: info.text })}
        description={t("address.seoDescription", { address: info.text })}
        noindex
      />
      <div className="search__inner">
        <Breadcrumbs items={crumbs} />

        <p className="address__eyebrow">{t("address.title")}</p>
        <h1 className="search__title">{info.text}</h1>
        {place && <p className="address__place">{place}</p>}
        {summaryText && <p className="address__summary">{summaryText}</p>}

        <div className="address__card">
          <h2 className="address__subtitle">{t("address.chartTitle")}</h2>
          <CompaniesChart points={timeline} label={t("address.chartTitle")} />

          {timeline.length > 1 && (
            <p className="address__delta">
              {t("address.delta", {
                from: first.companies,
                fromDate: formatDate(first.takenOn),
                to: last.companies,
                toDate: formatDate(last.takenOn),
              })}
              <span
                className={`address__diff${
                  difference > 0
                    ? " address__diff--up"
                    : difference < 0
                      ? " address__diff--down"
                      : ""
                }`}
              >
                {difference > 0 ? `+${difference}` : difference}
              </span>
            </p>
          )}
        </div>

        {units.length > 0 && (
          <div className="address__card">
            <h2 className="address__subtitle">{t("address.unitsTitle")}</h2>
            <p className="address__count">
              {t("address.unitsCount", {
                date: formatDate(info.snapshot?.takenOn || selected),
                count: info.unitsTotal.toLocaleString("ru-RU"),
              })}
            </p>

            <div className="search__list">
              {shownUnits.map((item) => (
                <Link
                  key={item.id}
                  to={`/${locale}/unit/${item.id}`}
                  className="search__item"
                >
                  <div>
                    <p className="search__item-name">{unitName(item, t)}</p>
                    <p className="search__item-meta">
                      {t("address.unitCompanies", { count: item.companies })}
                      {item.number && item.floor
                        ? ` · ${t("unit.floor", { floor: item.floor })}`
                        : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {showAllUnits && info.unitsTotal > units.length && (
              <p className="address__count">
                {t("address.unitsLimited", {
                  shown: units.length,
                  total: info.unitsTotal,
                })}
              </p>
            )}

            {units.length > UNITS_PREVIEW && (
              <button
                className="search__more"
                onClick={() => setShowAllUnits((value) => !value)}
              >
                {showAllUnits ? t("address.unitsLess") : t("address.unitsAll")}
              </button>
            )}
          </div>
        )}

        <div className="address__card">
          <div className="address__head">
            <h2 className="address__subtitle">{t("address.listTitle")}</h2>
            <label className="address__select">
              {t("address.date")}
              <select
                value={selected}
                onChange={(e) => setDate(e.target.value)}
              >
                {timeline.map((point) => (
                  <option key={point.takenOn} value={point.takenOn}>
                    {formatDate(point.takenOn)}
                    {point.isTest ? ` (${t("history.snapshotTest")})` : ""}
                  </option>
                ))}
              </select>
            </label>
            {(units.length > 0 || info.withoutUnit > 0) && (
              <label className="address__select">
                {t("address.unitFilter")}
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="">{t("address.unitFilterAll")}</option>
                  {info.withoutUnit > 0 && (
                    <option value="none">
                      {t("address.unitFilterNone", {
                        count: info.withoutUnit,
                      })}
                    </option>
                  )}
                  {selectedMissing && <option value={unit}>—</option>}
                  {units.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {unitName(item, t)} ({item.companies})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <p className="address__count">
            {t("address.count", { count: data.total.toLocaleString("ru-RU") })}
          </p>

          {data.companies.length === 0 && (
            <p className="search__message">{t("address.empty")}</p>
          )}

          <div className="search__list">
            {data.companies.map((item) => (
              <CompanyLink
                key={item.bin}
                slug={item.slug}
                className="search__item"
              >
                <div>
                  <p className="search__item-name">{nameOf(item)}</p>
                  <p className="search__item-meta">
                    {t("company.bin")} {item.bin}
                    {item.unit
                      ? ` · ${
                          item.unitNumber || item.unitFloor
                            ? unitName(
                                {
                                  kind: item.unitKind,
                                  number: item.unitNumber,
                                  floor: item.unitFloor,
                                },
                                t,
                              )
                            : t("address.unit", { unit: item.unit })
                        }`
                      : ""}
                  </p>
                </div>
              </CompanyLink>
            ))}
          </div>

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
      </div>
    </section>
  );
}
