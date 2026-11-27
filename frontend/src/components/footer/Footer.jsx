import { useLocale } from "../../i18n/context";
import { Link } from "../../i18n/router";
import "./_Footer.scss";

import Logo from "../logo/Logo";

const DEFAULT_COLUMNS = [
  {
    title: "footer.service",
    links: [
      { k: "footer.companies" },
      { k: "footer.cities" },
      { k: "footer.oked" },
    ],
  },
  {
    title: "footer.about",
    links: [{ k: "footer.contacts" }, { k: "footer.faq" }],
  },
  {
    title: "footer.legal",
    links: [{ k: "footer.terms" }, { k: "footer.privacy" }],
  },
];

function FooterLink({ link, t }) {
  if (link.to) return <Link to={link.to}>{t(link.k)}</Link>;
  if (link.href) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer">
        {t(link.k)}
      </a>
    );
  }
  return <a>{t(link.k)}</a>;
}

export default function Footer({
  columns = DEFAULT_COLUMNS,
  intro = "footer.intro",
  rights = "footer.rights",
  basedOn = "footer.basedOn",
}) {
  const { t } = useLocale();

  return (
    <footer className="footer">
      <div className="footer__up">
        <div className="footer__up-intro">
          <h2 className="footer__up-intro-header">
            <Logo className="footer__up-logo" />
          </h2>
          <p className="footer__up-intro-text">{t(intro)}</p>
        </div>
        <div className="footer__up-info">
          {columns.map((column) => (
            <div key={column.title} className="footer__up-info-block">
              <h3 className="footer__up-info-block-header">
                {t(column.title)}
              </h3>
              <ul className="footer__up-info-block-list">
                {column.links.map((link) => (
                  <li
                    key={link.k + (link.to || link.href || "")}
                    className="footer__up-info-block-list-item"
                  >
                    <FooterLink link={link} t={t} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="footer__down">
        <p className="footer__down-text">{t(rights)}</p>
        <p className="footer__down-text">{t(basedOn)}</p>
      </div>
    </footer>
  );
}
