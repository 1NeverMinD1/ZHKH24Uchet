import { useLocale } from "../../i18n/context";
import "./_Cities.scss";

const CITIES = [
  { key: "almaty", kato: "750000000", count: "311 683" },
  { key: "astana", kato: "710000000", count: "212 062" },
  { key: "shymkent", kato: "790000000", count: "84 977" },
  { key: "aktau", kato: "471010000", count: "35 096" },
  { key: "atyrau", kato: "231010000", count: "31 838" },
];

export default function Cities() {
  const { t } = useLocale();

  return (
    <div className="sities">
      <div className="sities__intro">
        <h2 className="sities__intro-title">{t("cities.title")}</h2>
        <p className="sities__intro-all">{t("cities.all")}</p>
      </div>

      <div className="sities__blocks">
        {CITIES.map((city, index) => (
          <div className="sities__blocks-block" key={city.key}>
            <div className="sities__blocks-block-left">
              <p className="sities__blocks-block-num">{index + 1}</p>
              <p className="sities__blocks-block-left-intro">
                {t(`city.${city.key}`)}
              </p>
            </div>
            <div className="sities__blocks-block-right">
              <p className="sities__blocks-block-right-kat">KATO {city.kato}</p>
              <p className="sities__blocks-block-right-text">
                {city.count} {t("cities.count")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
