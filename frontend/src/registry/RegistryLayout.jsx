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

const FOOTER_COLUMNS = [
  {
    title: "registry.footer.registry",
    links: [
      { k: "registry.nav.companies", to: "/companies" },
      { k: "registry.nav.houses", to: "/houses" },
      { k: "registry.footer.complexes", to: "/complexes" },
    ],
  },
  {
    title: "registry.footer.types",
    links: [
      { k: "registry.typePlural.osi", to: "/companies?type=osi" },
      { k: "registry.typePlural.ksk", to: "/companies?type=ksk" },
      { k: "registry.typePlural.uk", to: "/companies?type=uk" },
      { k: "registry.typePlural.service", to: "/companies?type=service" },
    ],
  },
  {
    title: "registry.footer.project",
    links: [
      { k: "registry.footer.bindex", href: "https://bindex.kz" },
      { k: "registry.footer.zhkh24", href: "https://zhkh24.kz" },
      { k: "registry.footer.login", to: "/login" },
    ],
  },
];

export default function RegistryLayout({ locale }) {
  return (
    <LocaleProvider locale={locale}>
      <main className="main">
        <Header links={LINKS} brand="ЖКХ" />
        <Suspense fallback={<div className="route-fallback" />}>
          <Outlet />
        </Suspense>
        <Footer
          columns={FOOTER_COLUMNS}
          intro="registry.footer.intro"
          rights="registry.footer.rights"
          basedOn="registry.footer.basedOn"
        />
      </main>
    </LocaleProvider>
  );
}
