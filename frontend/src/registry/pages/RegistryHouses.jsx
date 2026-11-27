import { useState } from "react";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { fetchRegistryHouses } from "../../api/registry";
import { nameOf, placeOf, formatNumber } from "../format";
import useRegistryList from "../useRegistryList";
import { Pager, PlaceFilters } from "../ListParts";

const KEYS = ["q", "city", "district", "managed", "complex", "sort"];
const DEFAULTS = { sort: "address" };
const MANAGED = ["", "yes", "no"];
const SORTS = ["address", "recent"];

export default function RegistryHouses() {
  const { locale, t } = useLocale();
  const list = useRegistryList(KEYS, DEFAULTS, fetchRegistryHouses);
  const { values, data, update } = list;
  const [input, setInput] = useState(values.q);

  return (
    <section className="rg">
      <SEO title={t("registry.houses.seoTitle")} noindex />
      <div className="rg__inner">
        <h1 className="rg__title">{t("registry.houses.title")}</h1>

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
            placeholder={t("registry.houses.placeholder")}
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
            allCitiesKey="registry.houses.allCities"
          />
          <select
            className="rg__select"
            value={values.managed}
            onChange={(e) => update({ managed: e.target.value })}
          >
            {MANAGED.map((item) => (
              <option key={item || "all"} value={item}>
                {t(`registry.houses.managed.${item || "all"}`)}
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
                {t(`registry.houses.sort.${item}`)}
              </option>
            ))}
          </select>
          <label className="rg__check">
            <input
              type="checkbox"
              checked={values.complex === "1"}
              onChange={(e) => update({ complex: e.target.checked ? "1" : "" })}
            />
            {t("registry.houses.inComplex")}
          </label>
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
              <div className="rg__rows">
                {data.items.map((h) => (
                  <Link
                    key={h.address_id}
                    to={`/house/${h.address_id}`}
                    className="rg__row"
                  >
                    <div className="rg__row-main">
                      <span className="rg__row-title">{h.address}</span>
                      <span className="rg__card-meta">
                        {placeOf(h, locale) && (
                          <span>{placeOf(h, locale)}</span>
                        )}
                        {h.complex_name && (
                          <span>
                            {t("registry.complexLabel", {
                              name: h.complex_name,
                            })}
                          </span>
                        )}
                      </span>
                      <span className="rg__row-manager">
                        {h.manager ? (
                          <>
                            <span
                              className={`rg__badge rg__badge--${h.manager.role}`}
                            >
                              {t(`registry.type.${h.manager.role}`)}
                            </span>
                            <span>{nameOf(h.manager, locale)}</span>
                          </>
                        ) : (
                          <span>{t("registry.houses.noManager")}</span>
                        )}
                      </span>
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
