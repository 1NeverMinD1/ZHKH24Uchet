import SEO from "../../components/seo/SEO";
import JsonLd from "../../components/seo/JsonLd";
import Hero from "../../components/hero/Hero";
import Cities from "../../components/cities/Cities";
import Tutorial from "../../components/tutorial/Tutorial";
import Source from "../../components/source/Source";
import { useLocale } from "../../i18n/context";
import { SITE_NAME, SITE_URL } from "../../config/site";

export default function Home() {
  const { locale, t } = useLocale();

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: `${SITE_URL}/${locale}`,
        inLanguage: locale,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <>
      <SEO title={t("home.seoTitle")} description={t("home.seoDescription")} />
      <JsonLd data={schema} />
      <Hero />
      <Cities />
      <Tutorial />
      <Source />
    </>
  );
}
