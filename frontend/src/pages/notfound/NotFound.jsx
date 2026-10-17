import { Link } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import "./_NotFound.scss";

export default function NotFound({
  title = "Страница не найдена",
  text = "Возможно, адрес введён с ошибкой или страница была удалена.",
}) {
  return (
    <section className="notfound">
      <SEO title={title} noindex />
      <meta name="prerender-status-code" content="404" />
      <p className="notfound__code">404</p>
      <h1 className="notfound__title">{title}</h1>
      <p className="notfound__text">{text}</p>
      <div className="notfound__actions">
        <Link to="/" className="notfound__button">
          На главную
        </Link>
        <Link to="/companies" className="notfound__link">
          Каталог компаний
        </Link>
      </div>
    </section>
  );
}
