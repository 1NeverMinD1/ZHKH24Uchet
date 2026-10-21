import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import JsonLd from "../../components/seo/JsonLd";
import Breadcrumbs from "../../components/breadcrumbs/Breadcrumbs";
import NotFound from "../notfound/NotFound";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { localizePath } from "../../i18n/locales";
import { SITE_URL } from "../../config/site";
import { shortName } from "../../utils/companyName";
import { pick } from "../../utils/localized";
import CompanyHistory from "../../components/history/CompanyHistory";
import "./_Company.scss";

const BIN_PATTERN = /^\d{12}$/;

const formatDate = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
};

const truncate = (text, max = 160) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

function Row({ label, value, locked, lockedText }) {
  return (
    <div className="company__row">
      <dt>{label}</dt>
      <dd>
        {locked ? (
          <span className="company__locked">{lockedText}</span>
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}

const buildSchema = ({
  company,
  name,
  legalName,
  alternateName,
  url,
  locale,
  activity,
  locality,
  locked,
}) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${url}#organization`,
  url,
  name,
  legalName,
  alternateName: alternateName || undefined,
  inLanguage: locale,
  identifier: {
    "@type": "PropertyValue",
    propertyID: locale === "kk" ? "БСН" : "БИН",
    value: company.bin,
  },
  description: activity || undefined,
  address:
    locality || !locked
      ? {
          "@type": "PostalAddress",
          addressCountry: "KZ",
          addressLocality: locality || undefined,
          streetAddress:
            !locked && company.legal_address
              ? company.legal_address
              : undefined,
        }
      : undefined,
  foundingDate:
    !locked && company.registration_date
      ? company.registration_date
      : undefined,
});

export default function Company() {
  const { bin } = useParams();
  const { locale, t } = useLocale();
  const validBin = BIN_PATTERN.test(bin);
  const [result, setResult] = useState({
    bin: null,
    company: null,
    access: "guest",
    error: "",
    notFound: false,
  });

  useEffect(() => {
    if (!validBin) return;
    let cancelled = false;

    client
      .get(`/company-card/${bin}`)
      .then(({ data }) => {
        if (cancelled) return;
        setResult({
          bin,
          company: data.data,
          access: data.access,
          error: "",
          notFound: false,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const notFound = err.response?.status === 404;
        setResult({
          bin,
          company: null,
          access: "guest",
          error: notFound ? "" : "company.loadError",
          notFound,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [bin, validBin]);

  if (!validBin) {
    return (
      <NotFound
        title={t("company.notFoundTitle")}
        text={t("company.invalidBin")}
      />
    );
  }

  if (result.bin !== bin) {
    return (
      <section className="company">
        <SEO title={t("company.loadingTitle", { bin })} noindex />
        {t("common.loading")}
      </section>
    );
  }

  if (result.notFound) {
    return (
      <NotFound
        title={t("company.notFoundTitle")}
        text={t("company.notInBase", { bin })}
      />
    );
  }

  if (result.error) {
    return (
      <section className="company">
        <SEO title={t("company.errorTitle")} noindex />
        <p className="company__message">{t(result.error)}</p>
      </section>
    );
  }

  const company = result.company;
  const locked = result.access !== "member";
  const primary = pick(company, "name", locale);
  const secondary = locale === "kk" ? company.name_ru : company.name_kk;
  const title = shortName(primary);
  const activity = pick(company, "oked_name", locale);
  const locality = pick(company, "locality", locale);
  const oked = company.oked_code ? `${company.oked_code} — ${activity}` : "";
  const lockedText = t("company.locked");

  const description = truncate(
    [
      t("company.seoLead", { name: title, bin: company.bin }),
      activity && t("company.seoActivity", { value: activity }),
      locality && t("company.seoLocation", { value: locality }),
    ]
      .filter(Boolean)
      .join(" "),
  );

  const crumbs = [
    { name: t("breadcrumbs.home"), path: "/" },
    { name: t("companies.title"), path: "/companies" },
    { name: title, path: `/company/${company.bin}` },
  ];

  const schema = buildSchema({
    company,
    name: title,
    legalName: primary,
    alternateName: secondary,
    url: `${SITE_URL}${localizePath(locale, `/company/${company.bin}`)}`,
    locale,
    activity,
    locality,
    locked,
  });

  return (
    <section className="company">
      <SEO
        title={t("company.pageTitle", { name: title, bin: company.bin })}
        description={description}
      />
      <JsonLd data={schema} />
      <div className="company__card">
        <Breadcrumbs items={crumbs} />

        <div className="company__head">
          <div>
            <h1 className="company__name">{title}</h1>
            {title !== primary && <p className="company__name-kk">{primary}</p>}
            {secondary && secondary !== primary && (
              <p className="company__name-kk">{secondary}</p>
            )}
            <p className="company__bin">
              {t("company.bin")} {company.bin}
            </p>
          </div>
        </div>

        {locked && (
          <div className="company__notice">
            <p>{t("company.noticeText")}</p>
            <div className="company__notice-actions">
              <Link to="/register" className="company__notice-button">
                {t("company.noticeRegister")}
              </Link>
              <Link to="/login" className="company__notice-link">
                {t("company.noticeLogin")}
              </Link>
            </div>
          </div>
        )}

        <dl className="company__list">
          <Row label={t("company.oked")} value={oked} lockedText={lockedText} />
          <Row
            label={t("company.secondaryOked")}
            value={company.secondary_oked}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.locality")}
            value={locality}
            lockedText={lockedText}
          />
          <Row
            label={t("company.address")}
            value={company.legal_address}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.director")}
            value={company.director_name}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.registered")}
            value={formatDate(company.registration_date)}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.size")}
            value={pick(company, "krp_name", locale)}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.sector")}
            value={pick(company, "kse_name", locale)}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.ownership")}
            value={pick(company, "kfs_name", locale)}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.kato")}
            value={company.kato}
            locked={locked}
            lockedText={lockedText}
          />
        </dl>

        <CompanyHistory bin={company.bin} locked={locked} />
      </div>
    </section>
  );
}
