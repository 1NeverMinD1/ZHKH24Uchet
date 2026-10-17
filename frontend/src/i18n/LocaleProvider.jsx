import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { LocaleContext } from "./context";
import {
  DEFAULT_LOCALE,
  localizePath,
  saveLocale,
  stripLocale,
} from "./locales";
import { translations } from "./translations";

export default function LocaleProvider({ locale, children }) {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    document.documentElement.lang = locale;
    saveLocale(locale);
  }, [locale]);

  const value = useMemo(() => {
    const t = (key) =>
      translations[locale]?.[key] ?? translations[DEFAULT_LOCALE]?.[key] ?? key;

    const getSwitchPath = (target) =>
      `${localizePath(target, stripLocale(pathname))}${search}${hash}`;

    return { locale, t, getSwitchPath };
  }, [locale, pathname, search, hash]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
