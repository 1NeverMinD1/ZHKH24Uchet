import { Routes, Route } from "react-router-dom";
import "./_App.scss";
import Footer from "./components/footer/Footer";
import Header from "./components/header/Header";
import Home from "./pages/home/Home";
import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import Profile from "./pages/profile/Profile";
import Company from "./pages/company/Company";
import Search from "./pages/search/Search";

export default function App() {
  return (
    <main className="main">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/company/:bin" element={<Company />} />
        <Route path="/search" element={<Search />} />
      </Routes>
      <Footer />
    </main>
  );
}
