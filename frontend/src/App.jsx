import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import "./_App.scss";
import { LOCALES } from "./i18n/locales";
import LocaleLayout from "./i18n/LocaleLayout";
import LegacyRedirect from "./i18n/LegacyRedirect";
import Home from "./pages/home/Home";

const Login = lazy(() => import("./pages/login/Login"));
const Register = lazy(() => import("./pages/register/Register"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const Company = lazy(() => import("./pages/company/Company"));
const Address = lazy(() => import("./pages/address/Address"));
const Director = lazy(() => import("./pages/director/Director"));
const Search = lazy(() => import("./pages/search/Search"));
const Companies = lazy(() => import("./pages/companies/Companies"));
const NotFound = lazy(() => import("./pages/notfound/NotFound"));

const pages = (
  <>
    <Route index element={<Home />} />
    <Route path="login" element={<Login />} />
    <Route path="register" element={<Register />} />
    <Route path="profile" element={<Profile />} />
    <Route path="company/:bin" element={<Company />} />
    <Route path="address/:id" element={<Address />} />
    <Route path="director/:id" element={<Director />} />
    <Route path="search" element={<Search />} />
    <Route path="companies" element={<Companies />} />
    <Route path="*" element={<NotFound />} />
  </>
);

export default function App() {
  return (
    <Routes>
      {LOCALES.map((locale) => (
        <Route
          key={locale}
          path={`/${locale}`}
          element={<LocaleLayout locale={locale} />}
        >
          {pages}
        </Route>
      ))}
      <Route path="*" element={<LegacyRedirect />} />
    </Routes>
  );
}
