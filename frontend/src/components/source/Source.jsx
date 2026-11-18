import { useLocale } from "../../i18n/context";
import { formatDate } from "../../utils/dates";
import { useHomeStats } from "../../utils/homeStats";
import "./_Source.scss";

export default function Source() {
  const { t } = useLocale();
  const stats = useHomeStats();
  const updated = stats?.last?.takenOn;

  return (
    <div className="info__source">
      <h2 className="info__source-title">{t("datasource.title")}</h2>
      <div className="info__source-card">
        <a
          className="info__source-card-name"
          href="https://stat.gov.kz"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("datasource.name")} · stat.gov.kz
        </a>
        <p className="info__source-card-text">{t("datasource.text")}</p>
        {updated && (
          <p className="info__source-card-updated">
            {t("datasource.updated", { date: formatDate(updated) })}
          </p>
        )}
      </div>
    </div>
  );
}
