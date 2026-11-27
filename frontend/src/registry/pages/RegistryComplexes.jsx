import { useState } from "react";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryComplexes } from "../../api/registry";
import { formatNumber, pluralKey } from "../format";
import useRegistryList from "../useRegistryList";
import { Pager, PlaceFilters } from "../ListParts";

const KEYS = [
  "q",
  "city",
  "district",
  "multi",
  "status",
  "cls",
  "year",
  "sort",
];
const DEFAULTS = { sort: "houses" };
const STATUSES = ["", "built", "building"];
const CLASSES = ["", "эконом", "комфорт", "бизнес", "элит", "премиум"];
const SORTS = ["houses", "year", "name"];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function RegistryComplexes() {
  const { t } = useLocale();
  const list = useRegistryList(KEYS, DEFAULTS, fetchRegistryComplexes);
  const { values, data, update } = list;
  const [input, setInput] = useState(values.q);
  const filtered =
    values.q ||
    values.city ||
    values.district ||
    values.multi ||
    values.status ||
    values.cls ||
    values.year;

  return (
    <section className="rg">
      <SEO title={t("registry.complexes.seoTitle")} noindex />
      <div className="rg__inner">
        <h1 className="rg__title">{t("registry.complexes.title")}</h1>

        <form
          className="rg__search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: input.trim() });
          }}
        >
          <input
            className="rg__input"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("registry.complexes.placeholder")}
          />
          <button className="rg__button" type="submit">
            {t("registry.search")}
          </button>
        </form>

        <div className="rg__filters">
          <PlaceFilters
            values={values}
            cities={list.cities}
            districts={list.districts}
            update={update}
            t={t}
            allCitiesKey="registry.complexes.allCities"
          />
          <label className="rg__check">
            <input
              type="checkbox"
              checked={values.multi === "1"}
              onChange={(e) => update({ multi: e.target.checked ? "1" : "" })}
            />
            {t("registry.complexes.multi")}
          </label>
          <select
            className="rg__select"
            value={values.status}
            onChange={(e) => update({ status: e.target.value })}
          >
            {STATUSES.map((item) => (
              <option key={item || "all"} value={item}>
                {item
                  ? t(`registry.passport.status.${item}`)
                  : t("registry.statusFilter.all")}
              </option>
            ))}
          </select>
          <select
            className="rg__select"
            value={values.cls}
            onChange={(e) => update({ cls: e.target.value })}
          >
            {CLASSES.map((item) => (
              <option key={item || "all"} value={item}>
                {item ? cap(item) : t("registry.complexes.allClasses")}
              </option>
            ))}
          </select>
          <select
            className="rg__select"
            value={values.year}
            onChange={(e) => update({ year: e.target.value })}
          >
            <option value="">{t("registry.complexes.allYears")}</option>
            {list.years.map((item) => (
              <option key={item.year} value={item.year}>
                {item.year} ({formatNumber(item.count)})
              </option>
            ))}
          </select>
          <select
            className="rg__select"
            value={values.sort}
            onChange={(e) => update({ sort: e.target.value })}
          >
            {SORTS.map((item) => (
              <option key={item} value={item}>
                {t(`registry.complexes.sort.${item}`)}
              </option>
            ))}
          </select>
        </div>

        {list.loading && <p className="rg__status">{t("common.loading")}</p>}
        {list.failed && <p className="rg__status">{t("registry.loadError")}</p>}

        {data && (
          <>
            <p className="rg__status">
              {t("registry.found", { count: formatNumber(data.total) })}
            </p>

            {data.items.length === 0 ? (
              <p className="rg__status">
                {filtered ? t("registry.empty") : t("registry.complexes.empty")}
              </p>
            ) : (
              <div className="rg__tiles">
                {data.items.map((cx) => (
                  <Link
                    key={cx.slug}
                    to={`/complex/${cx.slug}`}
                    className="rg__tile"
                  >
                    <span className="rg__card-title">{cx.name}</span>
                    {cx.city && (
                      <span className="rg__tile-label">{cx.city}</span>
                    )}
                    {(cx.developer || cx.build_status) && (
                      <span className="rg__tile-label">
                        {[
                          cx.developer,
                          cx.build_status &&
                            t(`registry.passport.status.${cx.build_status}`),
                          cx.completion_year,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                    <span className="rg__tile-label">
                      {cx.houses}{" "}
                      {t(`registry.complexes.houses.${pluralKey(cx.houses)}`)}
                      {cx.apartments
                        ? ` · ${t("registry.complexes.apartments", { count: cx.apartments })}`
                        : ""}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            <Pager page={list.page} pages={list.pages} update={update} t={t} />
          </>
        )}
      </div>
    </section>
  );
}
