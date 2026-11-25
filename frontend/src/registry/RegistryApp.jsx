import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import "../_App.scss";
import { LOCALES } from "../i18n/locales";
import LegacyRedirect from "../i18n/LegacyRedirect";
import ScrollToTop from "../components/scroll/ScrollToTop";
import RegistryLayout from "./RegistryLayout";
import RegistryHome from "./pages/RegistryHome";

const RegistryCompanies = lazy(() => import("./pages/RegistryCompanies"));
const Login = lazy(() => import("../pages/login/Login"));
const Profile = lazy(() => import("../pages/profile/Profile"));
const NotFound = lazy(() => import("../pages/notfound/NotFound"));

const pages = (
  <>
    <Route index element={<RegistryHome />} />
    <Route path="companies" element={<RegistryCompanies />} />
    <Route path="login" element={<Login />} />
    <Route path="profile" element={<Profile />} />
    <Route path="*" element={<NotFound />} />
  </>
);

export default function RegistryApp() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {LOCALES.map((locale) => (
          <Route
            key={locale}
            path={`/${locale}`}
            element={<RegistryLayout locale={locale} />}
          >
            {pages}
          </Route>
        ))}
        <Route path="*" element={<LegacyRedirect />} />
      </Routes>
    </>
  );
}
