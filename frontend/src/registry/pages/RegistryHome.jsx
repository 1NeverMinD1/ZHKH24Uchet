import { useEffect, useState } from "react";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import {
  fetchRegistryCompanies,
  fetchRegistryHouses,
  fetchRegistryComplexes,
} from "../../api/registry";
import { TYPES, formatNumber } from "../format";

export default function RegistryHome() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [q, setQ] = useState("");
  const [counts, setCounts] = useState({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      ...TYPES.map((type) =>
        fetchRegistryCompanies({ type }).then((d) => [type, d.total]),
      ),
      fetchRegistryHouses().then((d) => ["houses", d.total]),
      fetchRegistryComplexes().then((d) => ["complexes", d.total]),
    ])
      .then((pairs) => {
        if (!cancelled) setCounts(Object.fromEntries(pairs));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const go = (path) => {
    const value = q.trim();
    navigate(value ? `${path}?q=${encodeURIComponent(value)}` : path);
  };

  return (
    <section className="rg">
      <SEO title={t("registry.home.seoTitle")} noindex />
      <div className="rg__inner">
        <div className="rg__hero">
          <h1 className="rg__title">{t("registry.home.title")}</h1>
          <p className="rg__lead">{t("registry.home.lead")}</p>
          <form
            className="rg__search"
            onSubmit={(e) => {
              e.preventDefault();
              go("/companies");
            }}
          >
            <input
              className="rg__input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("registry.home.placeholder")}
            />
            <button className="rg__button" type="submit">
              {t("registry.home.findCompany")}
            </button>
            <button
              className="rg__button rg__button--ghost"
              type="button"
              onClick={() => go("/houses")}
            >
              {t("registry.home.findHouse")}
            </button>
          </form>
        </div>

        <h2 className="rg__subtitle">{t("registry.home.subjects")}</h2>
        <div className="rg__tiles">
          {TYPES.filter((type) => counts[type] !== 0).map((type) => (
            <Link
              key={type}
              to={`/companies?type=${type}`}
              className="rg__tile"
            >
              <span className="rg__tile-value">
                {formatNumber(counts[type])}
              </span>
              <span className="rg__tile-label">
                {t(`registry.typePlural.${type}`)}
              </span>
            </Link>
          ))}
        </div>

        <h2 className="rg__subtitle">{t("registry.home.objects")}</h2>
        <div className="rg__tiles">
          <Link to="/houses" className="rg__tile">
            <span className="rg__tile-value">
              {formatNumber(counts.houses)}
            </span>
            <span className="rg__tile-label">{t("registry.home.houses")}</span>
          </Link>
          <Link to="/complexes" className="rg__tile">
            <span className="rg__tile-value">
              {formatNumber(counts.complexes)}
            </span>
            <span className="rg__tile-label">
              {t("registry.home.complexes")}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
