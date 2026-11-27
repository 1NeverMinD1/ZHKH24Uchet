import { formatNumber } from "./format";

export function Pager({ page, pages, update, t }) {
  if (pages <= 1) return null;
  return (
    <div className="rg__pager">
      <button
        type="button"
        className="rg__button rg__button--ghost"
        disabled={page <= 1}
        onClick={() => update({ page: page - 1 })}
      >
        {t("registry.prev")}
      </button>
      <span>{t("registry.page", { page, pages })}</span>
      <button
        type="button"
        className="rg__button rg__button--ghost"
        disabled={page >= pages}
        onClick={() => update({ page: page + 1 })}
      >
        {t("registry.next")}
      </button>
    </div>
  );
}

export function PlaceFilters({
  values,
  cities,
  districts,
  update,
  t,
  allCitiesKey,
}) {
  return (
    <>
      <select
        className="rg__select"
        value={values.city}
        onChange={(e) => update({ city: e.target.value })}
      >
        <option value="">{t(allCitiesKey)}</option>
        {cities.map((item) => (
          <option key={item.city} value={item.city}>
            {item.city} ({formatNumber(item.count)})
          </option>
        ))}
      </select>
      <select
        className="rg__select"
        value={values.district}
        disabled={!values.city || districts.length === 0}
        onChange={(e) => update({ district: e.target.value })}
      >
        <option value="">{t("registry.allDistricts")}</option>
        {districts.map((item) => (
          <option key={item.district} value={item.district}>
            {item.district} ({formatNumber(item.count)})
          </option>
        ))}
      </select>
    </>
  );
}
