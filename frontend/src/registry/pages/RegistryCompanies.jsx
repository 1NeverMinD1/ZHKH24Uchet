import { useState } from "react";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryCompanies } from "../../api/registry";
import { TYPES, nameOf, cityOf, formatNumber } from "../format";
import useRegistryList from "../useRegistryList";
import { Pager, PlaceFilters } from "../ListParts";

const KEYS = ["type", "status", "houses", "sort", "city", "district", "q"];
const DEFAULTS = { status: "active", sort: "houses" };
const STATUSES = ["active", "gone", "all"];
const HOUSES = ["", "yes", "no"];
const SORTS = ["houses", "name", "newest", "oldest"];

export default function RegistryCompanies() {
  const { locale, t } = useLocale();
  const list = useRegistryList(KEYS, DEFAULTS, fetchRegistryCompanies);
  const { values, data, update } = list;
  const [input, setInput] = useState(values.q);

  return (
    <section className="rg">
      <SEO title={t("registry.companies.seoTitle")} noindex />
      <div className="rg__inner">
        <h1 className="rg__title">{t("registry.companies.title")}</h1>

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
            placeholder={t("registry.companies.placeholder")}
          />
          <button className="rg__button" type="submit">
            {t("registry.search")}
          </button>
        </form>

        <div className="rg__tabs">
          <button
            type="button"
            className={`rg__tab${values.type === "" ? " rg__tab--active" : ""}`}
            onClick={() => update({ type: "" })}
          >
            {t("registry.all")}
          </button>
          {TYPES.map((item) => (
            <button
              key={item}
              type="button"
              className={`rg__tab${values.type === item ? " rg__tab--active" : ""}`}
              onClick={() => update({ type: item })}
            >
              {t(`registry.typePlural.${item}`)}
            </button>
          ))}
        </div>

        <div className="rg__filters">
          <PlaceFilters
            values={values}
            cities={list.cities}
            districts={list.districts}
            update={update}
            t={t}
            allCitiesKey="registry.companies.allCities"
          />
          <select
            className="rg__select"
            value={values.status}
            onChange={(e) => update({ status: e.target.value })}
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {t(`registry.statusFilter.${item}`)}
              </option>
            ))}
          </select>
          <select
            className="rg__select"
            value={values.houses}
            onChange={(e) => update({ houses: e.target.value })}
          >
            {HOUSES.map((item) => (
              <option key={item || "all"} value={item}>
                {t(`registry.companies.houses.${item || "all"}`)}
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
                {t(`registry.companies.sort.${item}`)}
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
              <p className="rg__status">{t("registry.empty")}</p>
            ) : (
              <div className="rg__list">
                {data.items.map((item) => (
                  <Link
                    key={item.bin}
                    to={`/company/${item.slug}`}
                    className="rg__card"
                  >
                    <div className="rg__card-main">
                      <div className="rg__card-meta">
                        <span
                          className={`rg__badge rg__badge--${item.zhkh_type}`}
                        >
                          {t(`registry.type.${item.zhkh_type}`)}
                        </span>
                        {item.status !== "active" && (
                          <span className="rg__badge rg__badge--gone">
                            {t("registry.status.gone")}
                          </span>
                        )}
                      </div>
                      <span className="rg__card-title">
                        {nameOf(item, locale)}
                      </span>
                      <div className="rg__card-meta">
                        <span>
                          {t("registry.bin")} {item.bin}
                        </span>
                        {cityOf(item, locale) && (
                          <span>{cityOf(item, locale)}</span>
                        )}
                      </div>
                    </div>
                    <div className="rg__card-side">
                      <div className="rg__num">{item.houses_current}</div>
                      <div className="rg__num-label">
                        {t("registry.housesNow")}
                      </div>
                      {item.houses_past > 0 && (
                        <div className="rg__num-label">
                          {t("registry.housesPast", {
                            count: item.houses_past,
                          })}
                        </div>
                      )}
                    </div>
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
