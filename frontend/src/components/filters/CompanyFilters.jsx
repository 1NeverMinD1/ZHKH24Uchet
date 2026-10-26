import { useEffect, useState } from "react";
import client from "../../api/client";
import { useLocale } from "../../i18n/context";
import { pick } from "../../utils/localized";
import { formatDate } from "../../utils/dates";
import {
  FILTER_KEYS,
  KINDS,
  LEGAL_FORMS,
  SORTS,
} from "../../utils/companyFilters";
import { useFilterOptions } from "../../utils/filterOptions";

const ADVANCED_KEYS = [
  "oked",
  "krp",
  "kse",
  "kfs",
  "registered_from",
  "registered_to",
];

export default function CompanyFilters({ filters, update, onReset }) {
  const { locale, t } = useLocale();
  const [snapshots, setSnapshots] = useState([]);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState({ region: "", list: [] });
  const options = useFilterOptions();
  const [expanded, setExpanded] = useState(() =>
    ADVANCED_KEYS.some((key) => filters[key]),
  );

  const changedKey = filters.changed || "";
  const historyMode = changedKey !== "";
  const period = filters.mode === "period";
  const region = filters.region || "";

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

  const toggleKind = (kind) => {
    const selected = new Set(changedKey ? changedKey.split(",") : []);
    if (selected.has(kind)) {
      selected.delete(kind);
    } else {
      selected.add(kind);
    }
    update({ changed: KINDS.filter((item) => selected.has(item)).join(",") });
  };

  const applyOked = (value) => {
    const code = value.replace(/\D/g, "").slice(0, 5);
    if (code !== (filters.oked || "")) update({ oked: code });
  };

  const counted = (label, count) =>
    `${label} (${Number(count).toLocaleString("ru-RU")})`;

  const optionLabel = (snapshot) =>
    `${formatDate(snapshot.takenOn)}${
      snapshot.isTest ? ` (${t("history.snapshotTest")})` : ""
    }`;

  const districtList = districts.region === region ? districts.list : [];
  const lastSnapshot = snapshots[snapshots.length - 1];
  const defaultTo = lastSnapshot ? lastSnapshot.takenOn : "";
  const defaultFrom =
    snapshots.length > 1 ? snapshots[snapshots.length - 2].takenOn : defaultTo;
  const hasFilters = FILTER_KEYS.some((key) => filters[key]);
  const formCounts = new Map(
    (options?.legalForms || []).map((item) => [item.code, item.count]),
  );

  const dictionary = (name, list) => (
    <label className="filters__field">
      {t(`filters.${name}`)}
      <select
        className="filters__select"
        value={filters[name] || ""}
        onChange={(e) => update({ [name]: e.target.value })}
      >
        <option value="">{t("filters.all")}</option>
        {(list || []).map((item) => (
          <option key={item.code} value={item.code}>
            {counted(pick(item, "name", locale) || item.code, item.count)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="filters">
      <p className="filters__title">{t("history.filtersTitle")}</p>

      <div className="filters__row">
        {KINDS.map((kind) => (
          <label key={kind} className="filters__check">
            <input
              type="checkbox"
              checked={changedKey.split(",").includes(kind)}
              onChange={() => toggleKind(kind)}
            />
            {t(`history.kind.${kind}`)}
          </label>
        ))}
      </div>

      <div className="filters__row">
        <label className="filters__field">
          {t("filters.mode")}
          <select
            className="filters__select"
            value={period ? "period" : "compare"}
            disabled={!historyMode}
            onChange={(e) =>
              update({ mode: e.target.value === "period" ? "period" : "" })
            }
          >
            <option value="compare">{t("filters.mode.compare")}</option>
            <option value="period">{t("filters.mode.period")}</option>
          </select>
        </label>

        <label className="filters__field">
          {t(period ? "filters.periodFrom" : "filters.compareFrom")}
          <select
            className="filters__select"
            value={filters.from || defaultFrom}
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
          {t(period ? "filters.periodTo" : "filters.compareTo")}
          <select
            className="filters__select"
            value={filters.to || defaultTo}
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
            value={filters.district || ""}
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
      </div>

      <div className="filters__row">
        <label className="filters__field">
          {t("filters.form")}
          <select
            className="filters__select"
            value={filters.form || ""}
            onChange={(e) => update({ form: e.target.value })}
          >
            <option value="">{t("filters.all")}</option>
            {LEGAL_FORMS.filter((code) => !options || formCounts.has(code)).map(
              (code) => (
                <option key={code} value={code}>
                  {formCounts.has(code)
                    ? counted(t(`legalForm.${code}`), formCounts.get(code))
                    : t(`legalForm.${code}`)}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="filters__field">
          {t("filters.status")}
          <select
            className="filters__select"
            value={filters.status || ""}
            onChange={(e) => update({ status: e.target.value })}
          >
            <option value="">{t("filters.status.active")}</option>
            <option value="gone">{t("filters.status.gone")}</option>
            <option value="all">{t("filters.status.all")}</option>
          </select>
        </label>

        <label className="filters__field">
          {t("filters.sort")}
          <select
            className="filters__select"
            value={filters.sort || "name_asc"}
            onChange={(e) =>
              update({
                sort: e.target.value === "name_asc" ? "" : e.target.value,
              })
            }
          >
            {SORTS.map((sort) => (
              <option
                key={sort}
                value={sort}
                disabled={
                  historyMode && (sort === "newest" || sort === "oldest")
                }
              >
                {t(`filters.sort.${sort}`)}
              </option>
            ))}
          </select>
        </label>

        <button
          className="filters__reset"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? t("filters.less") : t("filters.more")}
        </button>

        {hasFilters && (
          <button className="filters__reset" type="button" onClick={onReset}>
            {t("history.reset")}
          </button>
        )}
      </div>

      {expanded && (
        <>
          <div className="filters__row">
            <label className="filters__field">
              {t("filters.oked")}
              <input
                key={filters.oked || ""}
                className="filters__select"
                type="text"
                inputMode="numeric"
                list="oked-options"
                defaultValue={filters.oked || ""}
                placeholder={t("filters.okedPlaceholder")}
                onBlur={(e) => applyOked(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyOked(e.currentTarget.value);
                  }
                }}
              />
              <datalist id="oked-options">
                {(options?.oked || []).map((item) => (
                  <option key={item.code} value={item.code}>
                    {`${item.code} — ${pick(item, "name", locale) || ""}`}
                  </option>
                ))}
              </datalist>
            </label>

            {dictionary("krp", options?.krp)}
            {dictionary("kse", options?.kse)}
            {dictionary("kfs", options?.kfs)}
          </div>

          <div className="filters__row">
            <label className="filters__field">
              {t("filters.registeredFrom")}
              <input
                className="filters__select"
                type="date"
                value={filters.registered_from || ""}
                onChange={(e) => update({ registered_from: e.target.value })}
              />
            </label>
            <label className="filters__field">
              {t("filters.registeredTo")}
              <input
                className="filters__select"
                type="date"
                value={filters.registered_to || ""}
                onChange={(e) => update({ registered_to: e.target.value })}
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}
