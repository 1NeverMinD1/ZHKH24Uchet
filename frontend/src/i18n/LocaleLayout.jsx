import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import LocaleProvider from "./LocaleProvider";

export default function LocaleLayout({ locale }) {
  return (
    <LocaleProvider locale={locale}>
      <main className="main">
        <Header />
        <Suspense fallback={<div className="route-fallback" />}>
          <Outlet />
        </Suspense>
        <Footer />
      </main>
    </LocaleProvider>
  );
}
