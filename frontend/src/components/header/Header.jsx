import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Link, NavLink } from "../../i18n/router";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import LanguageSwitcher from "../language/LanguageSwitcher";
import StableLabel from "./StableLabel";
import "./_Header.scss";

const getInitials = (user) => {
  const first = (user.firstName || "").trim()[0] || "";
  const last = (user.lastName || "").trim()[0] || "";
  return (first + last || (user.username || "?")[0]).toUpperCase();
};

export default function Header() {
  useLocation();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [, setTick] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    const sync = () => setTick((n) => n + 1);
    window.addEventListener("user-updated", sync);
    return () => window.removeEventListener("user-updated", sync);
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAuth = Boolean(token && user);

  const closeAll = () => {
    setMenuOpen(false);
    setUserOpen(false);
  };

  const handleLogout = () => {
    closeAll();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `header__link${isActive ? " header__link--active" : ""}`;

  const fullName = isAuth
    ? `${user.lastName || ""} ${user.firstName || ""}`.trim() || user.username
    : "";

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__logo" onClick={closeAll}>
          <span className="header__logo-text">ЖКХ24 Учет</span>
        </Link>

        <button
          className="header__burger"
          type="button"
          aria-label={t("header.menu")}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <div
          className={`header__panel${menuOpen ? " header__panel--open" : ""}`}
        >
          <nav className="header__nav">
            <NavLink to="/companies" className={linkClass} onClick={closeAll}>
              <StableLabel k="header.companies" />
            </NavLink>
            <span
              className="header__link header__link--soon"
              title={t("header.soon")}
            >
              <StableLabel k="header.registries" />
            </span>
            <span
              className="header__link header__link--soon"
              title={t("header.soon")}
            >
              <StableLabel k="header.about" />
            </span>
          </nav>

          <div className="header__actions">
            <LanguageSwitcher />
            {isAuth ? (
              <div className="header__user" ref={userRef}>
                <button
                  className={`header__trigger${userOpen ? " header__trigger--open" : ""}`}
                  type="button"
                  aria-expanded={userOpen}
                  onClick={() => setUserOpen((open) => !open)}
                >
                  <span className="header__avatar">{getInitials(user)}</span>
                  <span className="header__user-name">
                    {user.firstName || user.username}
                  </span>
                  <span
                    className={`header__chevron${userOpen ? " header__chevron--open" : ""}`}
                  />
                </button>

                {userOpen && (
                  <div className="header__dropdown">
                    <div className="header__dropdown-head">
                      <p className="header__dropdown-name">{fullName}</p>
                      {user.email && (
                        <p className="header__dropdown-email">{user.email}</p>
                      )}
                    </div>
                    <Link
                      to="/profile"
                      className="header__dropdown-item"
                      onClick={closeAll}
                    >
                      {t("header.profile")}
                    </Link>
                    <button
                      className="header__dropdown-item"
                      type="button"
                      onClick={handleLogout}
                    >
                      {t("header.logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="header__btn header__btn--outline"
                  onClick={closeAll}
                >
                  <StableLabel k="header.login" />
                </Link>
                <Link
                  to="/register"
                  className="header__btn header__btn--filled"
                  onClick={closeAll}
                >
                  <StableLabel k="header.register" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
