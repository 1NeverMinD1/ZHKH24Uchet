import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { localizePath } from "../../i18n/locales";
import JsonLd from "../seo/JsonLd";
import { SITE_URL } from "../../config/site";
import "./_Breadcrumbs.scss";

export default function Breadcrumbs({ items }) {
  const { locale, t } = useLocale();

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${localizePath(locale, item.path)}`,
    })),
  };

  return (
    <>
      <JsonLd data={data} />
      <nav className="breadcrumbs" aria-label={t("breadcrumbs.label")}>
        <ol className="breadcrumbs__list">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={item.path} className="breadcrumbs__item">
                {isLast ? (
                  <span aria-current="page">{item.name}</span>
                ) : (
                  <Link to={item.path}>{item.name}</Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
