import { useLocale } from "../../i18n/context";
import "./_Source.scss";

const SOURCES = [
  "stat.gov.kz",
  "kgd.gov.kz",
  "egov.kz",
  "goszakup.gov.kz",
  "elicense.kz",
];

export default function Source() {
  const { t } = useLocale();

  return (
    <div className="info__source">
      <h2 className="info__source-title">{t("source.title")}</h2>
      <div className="info__source-blocks">
        {SOURCES.map((source) => (
          <p className="info__source-blocks-block" key={source}>
            {source}
          </p>
        ))}
      </div>
    </div>
  );
}
