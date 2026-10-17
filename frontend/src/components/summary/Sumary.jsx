import { useLocale } from "../../i18n/context";
import "./_Summary.scss";

const ITEMS = ["companies", "sources", "history", "indicators"];

export default function InfoSummary() {
  const { t } = useLocale();

  return (
    <div className="summary">
      {ITEMS.map((item) => (
        <div className="summary__block" key={item}>
          <p className="summary__block-intro">{t(`summary.${item}.value`)}</p>
          <p className="summary__block-text">{t(`summary.${item}.label`)}</p>
        </div>
      ))}
    </div>
  );
}
