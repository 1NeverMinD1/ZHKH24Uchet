import { useLocale } from "../../i18n/context";
import "./_Footer.scss";

export default function Footer() {
  const { t } = useLocale();

  return (
    <footer className="footer">
      <div className="footer__up">
        <div className="footer__up-intro">
          <h2 className="footer__up-intro-header">ЖКХ24 Учет</h2>
          <p className="footer__up-intro-text">{t("footer.intro")}</p>
        </div>
        <div className="footer__up-info">
          <div className="footer__up-info-block">
            <h3 className="footer__up-info-block-header">
              {t("footer.service")}
            </h3>
            <ul className="footer__up-info-block-list">
              <li className="footer__up-info-block-list-item">
                <a>{t("footer.companies")}</a>
              </li>
              <li className="footer__up-info-block-list-item">
                <a>{t("footer.cities")}</a>
              </li>
              <li className="footer__up-info-block-list-item">
                <a>{t("footer.oked")}</a>
              </li>
            </ul>
          </div>
          <div className="footer__up-info-block">
            <h3 className="footer__up-info-block-header">
              {t("footer.about")}
            </h3>
            <ul className="footer__up-info-block-list">
              <li className="footer__up-info-block-list-item">
                <a>{t("footer.contacts")}</a>
              </li>
              <li className="footer__up-info-block-list-item">
                <a>{t("footer.faq")}</a>
              </li>
            </ul>
          </div>
          <div className="footer__up-info-block">
            <h3 className="footer__up-info-block-header">
              {t("footer.legal")}
            </h3>
            <ul className="footer__up-info-block-list">
              <li className="footer__up-info-block-list-item">
                <a>{t("footer.terms")}</a>
              </li>
              <li className="footer__up-info-block-list-item">
                <a>{t("footer.privacy")}</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer__down">
        <p className="footer__down-text">{t("footer.rights")}</p>
        <p className="footer__down-text">{t("footer.basedOn")}</p>
      </div>
    </footer>
  );
}
