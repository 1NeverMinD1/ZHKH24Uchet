import { useLocale } from "../../i18n/context";
import { useHomeStats } from "../../utils/homeStats";
import "./_Summary.scss";

const number = (value) =>
  value || value === 0 ? Number(value).toLocaleString("ru-RU") : "—";

export default function InfoSummary() {
  const { t } = useLocale();
  const stats = useHomeStats();
  const last = stats?.last;

  const items = [
    { key: "active", value: number(last?.total) },
    { key: "appeared", value: number(last?.appeared) },
    { key: "changed", value: number(last?.changed) },
    { key: "since", value: "2018" },
  ];

  return (
    <div className="summary">
      {items.map((item) => (
        <div className="summary__block" key={item.key}>
          <p className="summary__block-intro">{item.value}</p>
          <p className="summary__block-text">{t(`summary.${item.key}`)}</p>
        </div>
      ))}
    </div>
  );
}
