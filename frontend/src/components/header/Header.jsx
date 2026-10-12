import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./_Header.scss";

export default function Header() {
  useLocation();
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  useEffect(() => {
    const sync = () => setTick((t) => t + 1);
    window.addEventListener("user-updated", sync);
    return () => window.removeEventListener("user-updated", sync);
  }, []);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="header">
      <Link to="/" className="header__logo">
        <span className="header__logo-text">ЖКХ24 Учет</span>
      </Link>
      <ul className="header__menu">
        <li className="header__menu__item">Компании</li>
        <li className="header__menu__item">Реестры</li>
        <li className="header__menu__item">О сервисе</li>
      </ul>
      {token && user ? (
        <div className="header__user">
          <Link to="/profile" className="header__user-name">
            {user.firstName || user.username}
          </Link>
          <button className="header__logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      ) : (
        <Link to="/login" className="header__auth">
          Войти
        </Link>
      )}
    </header>
  );
}
