import { createContext, useContext } from "react";
import { DEFAULT_LOCALE } from "./locales";

export const LocaleContext = createContext({
  locale: DEFAULT_LOCALE,
  t: (key) => key,
  getSwitchPath: () => "/",
});

export const useLocale = () => useContext(LocaleContext);
