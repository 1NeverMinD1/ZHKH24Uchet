import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import LocaleProvider from "../i18n/LocaleProvider";
import "./_Registry.scss";

const LINKS = [
  { to: "/companies", k: "registry.nav.companies" },
  { to: "/houses", k: "registry.nav.houses" },
  { to: "/complexes", k: "registry.nav.complexes" },
];

export default function RegistryLayout({ locale }) {
  return (
    <LocaleProvider locale={locale}>
      <main className="main">
        <Header links={LINKS} brand="ЖКХ" />
        <Suspense fallback={<div className="route-fallback" />}>
          <Outlet />
        </Suspense>
        <Footer />
      </main>
    </LocaleProvider>
  );
}
