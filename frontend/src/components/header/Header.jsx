import "./_header.scss";

export default function Header() {
  return (
    <header className="header">
      <div className="logo">
        <span className="logo-text">ЖКХ24 Учет</span>
      </div>
      <div className="header__menu">
        <ul className="header__menu-list">
          <li className="header__menu-list-item">Компании</li>
          <li className="header__menu-list-item">Реестры</li>
          <li className="header__menu-list-item">О сервисе</li>
        </ul>
      </div>
    </header>
  );
}
