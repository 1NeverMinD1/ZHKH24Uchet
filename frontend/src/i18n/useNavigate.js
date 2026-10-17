import { useCallback } from "react";
import { useNavigate as useRouterNavigate } from "react-router-dom";
import { useLocale } from "./context";
import { localizePath } from "./locales";

export function useNavigate() {
  const navigate = useRouterNavigate();
  const { locale } = useLocale();

  return useCallback(
    (to, options) => {
      if (typeof to === "string" && to.startsWith("/")) {
        return navigate(localizePath(locale, to), options);
      }
      return navigate(to, options);
    },
    [navigate, locale],
  );
}
