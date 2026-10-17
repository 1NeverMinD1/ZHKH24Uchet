import SEO from "../../components/seo/SEO";
import JsonLd from "../../components/seo/JsonLd";
import Hero from "../../components/hero/Hero";
import Cities from "../../components/cities/Cities";
import Tutorial from "../../components/tutorial/Tutorial";
import Source from "../../components/source/Source";
import { SITE_NAME, SITE_URL } from "../../config/site";

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
      url: SITE_URL,
      inLanguage: "ru",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function Home() {
  return (
    <>
      <SEO title="Проверка компаний Казахстана по БИН и названию" />
      <JsonLd data={schema} />
      <Hero />
      <Cities />
      <Tutorial />
      <Source />
    </>
  );
}
