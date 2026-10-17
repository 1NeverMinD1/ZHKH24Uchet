import { useLocale } from "../../i18n/context";
import { translations } from "../../i18n/translations";
import "./_StableLabel.scss";

export default function StableLabel({ k }) {
  const { t } = useLocale();

  return (
    <span className="stable">
      <span className="stable__text">{t(k)}</span>
      <span className="stable__ghost" aria-hidden="true">
        {translations.ru[k]}
      </span>
      <span className="stable__ghost" aria-hidden="true">
        {translations.kk[k]}
      </span>
    </span>
  );
}
