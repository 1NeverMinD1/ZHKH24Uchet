import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import "./_NotFound.scss";

export default function NotFound({ title, text }) {
  const { t } = useLocale();
  const heading = title ?? t("notfound.title");
  const message = text ?? t("notfound.text");

  return (
    <section className="notfound">
      <SEO title={heading} noindex />
      <meta name="prerender-status-code" content="404" />
      <p className="notfound__code">404</p>
      <h1 className="notfound__title">{heading}</h1>
      <p className="notfound__text">{message}</p>
      <div className="notfound__actions">
        <Link to="/" className="notfound__button">
          {t("notfound.home")}
        </Link>
        <Link to="/companies" className="notfound__link">
          {t("notfound.catalog")}
        </Link>
      </div>
    </section>
  );
}
