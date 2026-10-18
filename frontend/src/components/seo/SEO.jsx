import { useLocation } from "react-router-dom";
import { useLocale } from "../../i18n/context";
import {
  DEFAULT_LOCALE,
  LOCALES,
  localizePath,
  stripLocale,
} from "../../i18n/locales";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "../../config/site";

const OG_LOCALES = { ru: "ru_RU", kk: "kk_KZ" };

export default function SEO({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
}) {
  const { pathname } = useLocation();
  const { locale, t } = useLocale();

  const text = description ?? t("home.seoDescription");
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const barePath = stripLocale(path ?? pathname);
  const urlFor = (code) => `${SITE_URL}${localizePath(code, barePath)}`;
  const canonical = urlFor(locale);
  const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={text} />
      <meta
        name="robots"
        content={noindex ? "noindex, follow" : "index, follow"}
      />
      {!noindex && <link rel="canonical" href={canonical} />}
      {!noindex &&
        LOCALES.map((code) => (
          <link
            key={code}
            rel="alternate"
            hrefLang={code}
            href={urlFor(code)}
          />
        ))}
      {!noindex && (
        <link
          rel="alternate"
          hrefLang="x-default"
          href={urlFor(DEFAULT_LOCALE)}
        />
      )}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={text} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:locale" content={OG_LOCALES[locale]} />
      {LOCALES.filter((code) => code !== locale).map((code) => (
        <meta
          key={code}
          property="og:locale:alternate"
          content={OG_LOCALES[code]}
        />
      ))}
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}
