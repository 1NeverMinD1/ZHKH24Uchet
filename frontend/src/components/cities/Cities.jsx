import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { pick } from "../../utils/localized";
import { useHomeStats } from "../../utils/homeStats";
import "./_Cities.scss";

const LIMIT = 8;

export default function Cities() {
  const { locale, t } = useLocale();
  const stats = useHomeStats();
  const byRegion = stats?.last?.byRegion || {};
  const names = new Map(
    (stats?.regions || []).map((item) => [item.kato.slice(0, 2), item]),
  );

  const list = Object.entries(byRegion)
    .filter(([code]) => names.has(code))
    .map(([code, value]) => ({
      code,
      total: Number(value.total) || 0,
      name: pick(names.get(code), "name", locale),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, LIMIT);

  return (
    <div className="sities">
      <div className="sities__intro">
        <h2 className="sities__intro-title">{t("regions.title")}</h2>
        <Link to="/stats" className="sities__intro-all">
          {t("regions.all")}
        </Link>
      </div>

      <div className="sities__blocks">
        {list.map((item, index) => (
          <Link
            key={item.code}
            to={`/companies?region=${item.code}`}
            className="sities__blocks-block"
          >
            <div className="sities__blocks-block-left">
              <p className="sities__blocks-block-num">{index + 1}</p>
              <p className="sities__blocks-block-left-intro">{item.name}</p>
            </div>
            <p className="sities__blocks-block-count">
              {t("regions.count", {
                count: item.total.toLocaleString("ru-RU"),
              })}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
