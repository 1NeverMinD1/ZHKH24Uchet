import { Navigate, useLocation } from "react-router-dom";
import { getPreferredLocale } from "./locales";

export default function LegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  const locale = getPreferredLocale();
  const path = pathname === "/" ? "" : pathname;

  return <Navigate to={`/${locale}${path}${search}${hash}`} replace />;
}
