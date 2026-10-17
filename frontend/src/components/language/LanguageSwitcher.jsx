import { Link } from "react-router-dom";
import { LOCALES } from "../../i18n/locales";
import { useLocale } from "../../i18n/context";
import "./_LanguageSwitcher.scss";

const LABELS = { ru: "RU", kk: "ҚАЗ" };
const NAMES = { ru: "Русский", kk: "Қазақша" };

export default function LanguageSwitcher() {
  const { locale, getSwitchPath } = useLocale();

  return (
    <div className="lang" role="group" aria-label="Language">
      {LOCALES.map((code) => (
        <Link
          key={code}
          to={getSwitchPath(code)}
          lang={code}
          hrefLang={code}
          title={NAMES[code]}
          aria-current={code === locale ? "true" : undefined}
          className={`lang__item${code === locale ? " lang__item--active" : ""}`}
        >
          {LABELS[code]}
        </Link>
      ))}
    </div>
  );
}
