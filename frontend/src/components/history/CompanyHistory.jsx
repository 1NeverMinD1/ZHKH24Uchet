import { useEffect, useState } from "react";
import client from "../../api/client";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { formatDate } from "../../utils/dates";
import { codeLabel, useFilterOptions } from "../../utils/filterOptions";
import "./_CompanyHistory.scss";

export default function CompanyHistory({ slug, locked }) {
  const { locale, t } = useLocale();
  const options = useFilterOptions();
  const [state, setState] = useState({
    slug: null,
    data: null,
    status: "idle",
  });

  useEffect(() => {
    if (locked || !slug) return;
    let cancelled = false;

    client
      .get(`/history/company/${slug}`)
      .then(({ data }) => {
        if (cancelled) return;
        setState({ slug, data: data.data, status: "ok" });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          slug,
          data: null,
          status: error.response?.status === 404 ? "none" : "error",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [slug, locked]);

  if (locked) {
    return (
      <section className="history">
        <h2 className="history__title">{t("history.card.title")}</h2>
        <p className="history__muted">{t("history.card.locked")}</p>
      </section>
    );
  }

  if (state.slug !== slug || state.status === "none") return null;

  if (state.status === "error") {
    return (
      <section className="history">
        <h2 className="history__title">{t("history.card.title")}</h2>
        <p className="history__muted">{t("history.loadError")}</p>
      </section>
    );
  }

  const { data } = state;
  const nobody = t("history.nobody");

  const seen = (item, index) => {
    if (index === 0)
      return t("history.card.seenSince", { date: formatDate(item.from) });
    if (item.from === item.to)
      return t("history.card.seenOnce", { date: formatDate(item.from) });
    return t("history.card.seenRange", {
      from: formatDate(item.from),
      to: formatDate(item.to),
    });
  };

  const placeOf = (item) =>
    locale === "kk" ? item.placeKk || item.place : item.place;

  const timeline = (title, items, render) => (
    <div key={title}>
      <h3 className="history__subtitle">{title}</h3>
      <ol className="history__list">
        {[...items].reverse().map((item, index) => (
          <li
            key={`${item.id}-${item.from}`}
            className={`history__item${index === 0 ? " history__item--current" : ""}`}
          >
            <p className="history__meta">
              {index === 0 && (
                <span className="history__badge">
                  {t("history.card.current")}
                </span>
              )}
              {seen(item, index)}
            </p>
            {render(item)}
          </li>
        ))}
      </ol>
    </div>
  );

  const value = (text) => <p className="history__value">{text || nobody}</p>;

  const codeBlock = (kind, items, dictionary) => [
    t(`history.tag.${kind}`),
    items,
    (item) =>
      value(
        dictionary
          ? codeLabel(options, dictionary, item.code, locale)
          : item.code && item.code.split(",").join(", "),
      ),
  ];

  const extras = [
    [
      t("history.tag.name"),
      data.names,
      (item) =>
        value(locale === "kk" ? item.kk || item.ru : item.ru || item.kk),
    ],
    codeBlock("oked", data.oked, "oked"),
    codeBlock("secondary_oked", data.secondaryOked, null),
    codeBlock("krp", data.krp, "krp"),
    codeBlock("kse", data.kse, "kse"),
    codeBlock("kfs", data.kfs, "kfs"),
  ].filter(([, items]) => items && items.length > 1);

  return (
    <section className="history">
      <h2 className="history__title">{t("history.card.title")}</h2>
      <p className="history__summary">
        {t("history.card.summary", {
          directors: data.directors.length - 1,
          addresses: data.addresses.length - 1,
        })}
      </p>

      <div className="history__columns">
        {timeline(t("history.card.directors"), data.directors, (item) => (
          <p className="history__value">
            {item.id && item.name ? (
              <Link to={`/director/${item.id}`} className="history__person">
                {item.name}
              </Link>
            ) : (
              item.name || nobody
            )}
          </p>
        ))}

        {timeline(t("history.card.addresses"), data.addresses, (item) => (
          <>
            {value(item.text)}
            {placeOf(item) && <p className="history__place">{placeOf(item)}</p>}
            {item.unit && (
              <p className="history__place">
                {t("history.card.unit", { unit: item.unit })}
              </p>
            )}
            {item.id && (
              <Link to={`/address/${item.id}`} className="history__link">
                {t("history.card.allCompanies")}
              </Link>
            )}
          </>
        ))}
      </div>

      {extras.length > 0 && (
        <div className="history__columns">
          {extras.map(([title, items, render]) =>
            timeline(title, items, render),
          )}
        </div>
      )}
    </section>
  );
}
