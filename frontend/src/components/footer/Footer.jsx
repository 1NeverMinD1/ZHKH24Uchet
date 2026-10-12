import "./_Footer.scss";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__up">
        <div className="footer__up-intro">
          <h2 className="footer__up-intro-header">ЖКХ24 Учет</h2>
          <p className="footer__up-intro-text">
            Проект на основе открытых государственных данных Республики
            Казахстан.
          </p>
        </div>
        <div className="footer__up-info">
          <div className="footer__up-info-block">
            <h3 className="footer__up-info-block-header">Сервис</h3>
            <ul className="footer__up-info-block-list">
              <li className="footer__up-info-block-list-item">
                <a>Компании</a>
              </li>
              <li className="footer__up-info-block-list-item">
                <a>Города</a>
              </li>
              <li className="footer__up-info-block-list-item">
                <a>ОКЭД</a>
              </li>
            </ul>
          </div>
          <div className="footer__up-info-block">
            <h3 className="footer__up-info-block-header">О нас</h3>
            <ul className="footer__up-info-block-list">
              <li className="footer__up-info-block-list-item">
                <a>Контакты</a>
              </li>
              <li className="footer__up-info-block-list-item">
                <a>FAQ</a>
              </li>
            </ul>
          </div>
          <div className="footer__up-info-block">
            <h3 className="footer__up-info-block-header">Правовое</h3>
            <ul className="footer__up-info-block-list">
              <li className="footer__up-info-block-list-item">
                <a>Соглашение</a>
              </li>
              <li className="footer__up-info-block-list-item">
                <a>Политика данных</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer__down">
        <p className="footer__down-text">
          © 2026 Реестр.kz — Все права защищены
        </p>
        <p className="footer__down-text">
          Данные основаны на открытых реестрах РК
        </p>
      </div>
    </footer>
  );
}
