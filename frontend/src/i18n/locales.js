export const LOCALES = ["ru", "kk"];
export const DEFAULT_LOCALE = "ru";

const STORAGE_KEY = "locale";

export const isLocale = (value) => LOCALES.includes(value);

const readSaved = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const saveLocale = (locale) => {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    return;
  }
};

export const getPreferredLocale = () => {
  const saved = readSaved();
  if (isLocale(saved)) return saved;

  const browser =
    typeof navigator === "undefined" ? "" : navigator.language || "";
  return browser.toLowerCase().startsWith("kk") ? "kk" : DEFAULT_LOCALE;
};

export const stripLocale = (pathname) => {
  const [, first, ...rest] = pathname.split("/");
  if (isLocale(first)) return `/${rest.join("/")}`;
  return pathname;
};

export const localizePath = (locale, path) => {
  const clean = stripLocale(path);
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
};
