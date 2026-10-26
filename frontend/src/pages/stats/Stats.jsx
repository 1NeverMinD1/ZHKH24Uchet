import { useEffect, useState } from "react";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import Breadcrumbs from "../../components/breadcrumbs/Breadcrumbs";
import CompaniesChart from "../../components/history/CompaniesChart";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { pick } from "../../utils/localized";
import { formatDate } from "../../utils/dates";
import { KINDS, LEGAL_FORMS } from "../../utils/companyFilters";
import "../search/_Search.scss";
import "../address/_Address.scss";
import "./_Stats.scss";

const number = (value) => Number(value || 0).toLocaleString("ru-RU");

const sum = (items, read) =>
  items.reduce((total, item) => total + (Number(read(item)) || 0), 0);

const breakdown = (items, field) => {
  const result = {};
  const last = items[items.length - 1]?.[field] || {};
  for (const [key, value] of Object.entries(last)) {
    result[key] = { total: value.total || 0, appeared: 0 };
  }
  for (const item of items) {
    for (const [key, value] of Object.entries(item[field] || {})) {
      result[key] = result[key] || { total: 0, appeared: 0 };
      result[key].appeared += value.appeared || 0;
    }
  }
  return result;
};

export default function Stats() {
  const { locale, t } = useLocale();
  const [state, setState] = useState({ status: "loading", data: null });
  const [regions, setRegions] = useState([]);
  const [range, setRange] = useState({ from: "", to: "" });

  useEffect(() => {
    let cancelled = false;

    client
      .get("/history/stats")
      .then(({ data }) => {
        if (!cancelled) setState({ status: "ok", data: data.data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", data: null });
      });

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

  const crumbs = [
    { name: t("breadcrumbs.home"), path: "/" },
    { name: t("stats.title"), path: "/stats" },
  ];

  const shell = (content) => (
    <section className="search">
      <SEO
        title={t("stats.seoTitle")}
        description={t("stats.seoDescription")}
      />
      <div className="search__inner">
        <Breadcrumbs items={crumbs} />
        <h1 className="search__title">{t("stats.title")}</h1>
        {content}
      </div>
    </section>
  );

  if (state.status === "loading") {
    return shell(<p className="search__message">{t("common.loading")}</p>);
  }

  if (state.status === "error") {
    return shell(<p className="search__message">{t("stats.loadError")}</p>);
  }

  const snapshots = state.data.snapshots;
  const dates = snapshots.map((item) => item.takenOn);
  const months = snapshots.filter((item) => item.previousTakenOn);

  if (months.length === 0) {
    return shell(<p className="search__message">{t("stats.empty")}</p>);
  }

  const lastMonth = months[months.length - 1];
  const from = range.from || lastMonth.previousTakenOn;
  const to = range.to || lastMonth.takenOn;

  const years = [...new Set(dates.map((date) => date.slice(0, 4)))].filter(
    (year) => months.some((item) => item.previousTakenOn.startsWith(year)),
  );

  const yearRange = (year) => {
    const start = dates.find((date) => date.startsWith(year));
    const next = dates.find((date) => date.slice(0, 4) > year);
    return { from: start, to: next || dates[dates.length - 1] };
  };

  const presets = [
    {
      key: "last",
      label: t("stats.lastMonth"),
      value: { from: lastMonth.previousTakenOn, to: lastMonth.takenOn },
    },
    ...years.map((year) => ({
      key: year,
      label: year,
      value: yearRange(year),
    })),
  ];

  const changeFrom = (value) => {
    if (value < to) {
      setRange({ from: value, to });
      return;
    }
    const next = dates.find((date) => date > value);
    if (next) setRange({ from: value, to: next });
  };

  const items = months.filter(
    (item) => item.previousTakenOn >= from && item.takenOn <= to,
  );
  const last = items[items.length - 1];

  const startMonth = from.slice(0, 7);
  const endMonth = to.slice(0, 7);
  const registered = state.data.registrations
    .filter((item) => item.month >= startMonth && item.month < endMonth)
    .reduce((total, item) => total + item.count, 0);

  const forms = breakdown(items, "byForm");
  const regionStats = breakdown(items, "byRegion");

  const regionName = (code) => {
    const region = regions.find((item) => item.kato.slice(0, 2) === code);
    return region ? pick(region, "name", locale) : t("stats.regionUnknown");
  };

  const latest = to === dates[dates.length - 1];

  const companiesUrl = (params) =>
    `/companies?${new URLSearchParams(params).toString()}`;

  const cell = (value, href) =>
    href && Number(value) > 0 ? (
      <Link to={href} className="stats__link">
        {number(value)}
      </Link>
    ) : (
      number(value)
    );

  const periodUrl = (params) =>
    companiesUrl({ ...params, from, to, mode: "period" });

  const cards = [
    [t("stats.total"), last?.total, ""],
    [
      t("stats.appeared"),
      sum(items, (item) => item.appeared),
      periodUrl({ changed: "appeared" }),
    ],
    [
      t("stats.disappeared"),
      sum(items, (item) => item.disappeared),
      periodUrl({ changed: "disappeared" }),
    ],
    [t("stats.changed"), sum(items, (item) => item.changed), ""],
    [t("stats.registered"), registered, ""],
  ];

  const inRange = snapshots.filter(
    (item) => item.takenOn >= from && item.takenOn <= to,
  );
  const points = (
    inRange.length > 24
      ? inRange.filter(
          (item, index) =>
            item.takenOn.slice(5, 7) === "01" || index === inRange.length - 1,
        )
      : inRange
  ).map((item) => ({
    takenOn: item.takenOn,
    companies: item.total,
    isTest: false,
  }));

  const formRows = LEGAL_FORMS.filter((code) => forms[code]).map((code) => [
    t(`legalForm.${code}`),
    forms[code],
    latest ? companiesUrl({ form: code }) : "",
    periodUrl({ changed: "appeared", form: code }),
  ]);

  const regionRows = Object.entries(regionStats)
    .map(([code, value]) => [
      regionName(code),
      value,
      latest && code !== "00" ? companiesUrl({ region: code }) : "",
      code !== "00" ? periodUrl({ changed: "appeared", region: code }) : "",
    ])
    .sort((a, b) => b[1].total - a[1].total);

  const table = (title, rows) => (
    <div className="address__card">
      <h2 className="address__subtitle">{title}</h2>
      <div className="stats__scroll">
        <table className="stats__table">
          <thead>
            <tr>
              <th />
              <th>{t("stats.colTotal")}</th>
              <th>{t("stats.colNew")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value, href, newHref]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{cell(value.total, href)}</td>
                <td>{cell(value.appeared, newHref)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return shell(
    <>
      <div className="stats__chips">
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={`stats__chip${
              preset.value.from === from && preset.value.to === to
                ? " stats__chip--active"
                : ""
            }`}
            onClick={() => setRange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="stats__head">
        <label className="stats__field">
          {t("stats.from")}
          <select
            className="stats__select"
            value={from}
            onChange={(e) => changeFrom(e.target.value)}
          >
            {dates.slice(0, -1).map((date) => (
              <option key={date} value={date}>
                {formatDate(date)}
              </option>
            ))}
          </select>
        </label>

        <label className="stats__field">
          {t("stats.to")}
          <select
            className="stats__select"
            value={to}
            onChange={(e) => setRange({ from, to: e.target.value })}
          >
            {dates.slice(1).map((date) => (
              <option key={date} value={date} disabled={date <= from}>
                {formatDate(date)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="stats__grid">
        {cards.map(([label, value, href]) =>
          href && Number(value) > 0 ? (
            <Link
              key={label}
              to={href}
              className="stats__card stats__card--link"
            >
              <p className="stats__label">{label}</p>
              <p className="stats__value">{number(value)}</p>
            </Link>
          ) : (
            <div key={label} className="stats__card">
              <p className="stats__label">{label}</p>
              <p className="stats__value">{number(value)}</p>
            </div>
          ),
        )}
      </div>

      <div className="address__card">
        <h2 className="address__subtitle">{t("stats.changesTitle")}</h2>
        <div className="stats__scroll">
          <table className="stats__table">
            <tbody>
              {KINDS.map((kind) => (
                <tr key={kind}>
                  <td>{t(`history.tag.${kind}`)}</td>
                  <td>
                    {cell(
                      sum(items, (item) => item.changes?.[kind]),
                      companiesUrl({ changed: kind, from, to, mode: "period" }),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {table(t("stats.formsTitle"), formRows)}
      {table(t("stats.regionsTitle"), regionRows)}

      <div className="address__card">
        <h2 className="address__subtitle">{t("stats.chartTitle")}</h2>
        <CompaniesChart points={points} label={t("stats.chartTitle")} />
      </div>
    </>,
  );
}
