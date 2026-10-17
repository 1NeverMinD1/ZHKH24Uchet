import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import "./_App.scss";
import Footer from "./components/footer/Footer";
import Header from "./components/header/Header";
import Home from "./pages/home/Home";

const Login = lazy(() => import("./pages/login/Login"));
const Register = lazy(() => import("./pages/register/Register"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const Company = lazy(() => import("./pages/company/Company"));
const Search = lazy(() => import("./pages/search/Search"));
const Companies = lazy(() => import("./pages/companies/Companies"));
const NotFound = lazy(() => import("./pages/notfound/NotFound"));

export default function App() {
  return (
    <main className="main">
      <Header />
      <Suspense fallback={<div className="route-fallback" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/company/:bin" element={<Company />} />
          <Route path="/search" element={<Search />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Footer />
    </main>
  );
}
