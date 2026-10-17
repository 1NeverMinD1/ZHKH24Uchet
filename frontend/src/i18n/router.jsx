import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  Navigate as RouterNavigate,
} from "react-router-dom";
import { useLocale } from "./context";
import { localizePath } from "./locales";

const localize = (locale, to) =>
  typeof to === "string" && to.startsWith("/") ? localizePath(locale, to) : to;

export function Link({ to, ...props }) {
  const { locale } = useLocale();
  return <RouterLink to={localize(locale, to)} {...props} />;
}

export function NavLink({ to, ...props }) {
  const { locale } = useLocale();
  return <RouterNavLink to={localize(locale, to)} {...props} />;
}

export function Navigate({ to, ...props }) {
  const { locale } = useLocale();
  return <RouterNavigate to={localize(locale, to)} {...props} />;
}
