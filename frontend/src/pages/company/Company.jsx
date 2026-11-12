import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import CompanyDashboard from "../../components/company/CompanyDashboard";
import "./_Company.scss";

const codeOf = (value = "") => {
  const slug = value.toLowerCase();
  const code = slug.slice(slug.lastIndexOf("-") + 1);
  return /^[0-9a-z]{10}$/.test(code) ? code : "";
};

const formatDate = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
};

const filterLink = (param, code, text) =>
  code && text ? (
    <Link to={`/companies?${param}=${encodeURIComponent(code)}`}>{text}</Link>
  ) : (
    text
  );

const monthRange = (value) => {
  const [year, month] = value.split("-");
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return `registered_from=${year}-${month}-01&registered_to=${year}-${month}-${String(lastDay).padStart(2, "0")}`;
};

const truncate = (text, max = 160) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

const fitSentences = (parts, max = 160) => {
  let text = "";
  for (const part of parts) {
    if (!part) continue;
    const next = text ? `${text} ${part}` : part;
    if (next.length <= max) text = next;
  }
  return text || truncate(parts.find(Boolean) || "", max);
};

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
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const code = codeOf(slug);
  const [result, setResult] = useState({
    code: null,
    company: null,
    access: "guest",
    error: "",
    notFound: false,
  });

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    client
      .get(`/company-card/${code}`)
      .then(({ data }) => {
        if (cancelled) return;
        setResult({
          code,
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
          code,
          company: null,
          access: "guest",
          error: notFound ? "" : "company.loadError",
          notFound,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  const actualSlug = result.code === code ? result.company?.slug : null;

  useEffect(() => {
    if (actualSlug && actualSlug !== slug) {
      navigate(localizePath(locale, `/company/${actualSlug}`), {
        replace: true,
      });
    }
  }, [actualSlug, slug, locale, navigate]);

  if (!code || (result.code === code && result.notFound)) {
    return (
      <NotFound
        title={t("company.notFoundTitle")}
        text={t("company.notFoundText")}
      />
    );
  }

  if (result.code !== code) {
    return (
      <section className="company">
        <SEO title={t("common.loading")} noindex />
        {t("common.loading")}
      </section>
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
  const region = /^\d{9}$/.test(company.kato || "")
    ? company.kato.slice(0, 2)
    : "";

  const okedValue = company.oked_code ? (
    <Link to={`/companies?oked=${company.oked_code}`}>{oked}</Link>
  ) : (
    ""
  );

  const secondaryValue = company.secondary_okeds?.length ? (
    <ul className="company__okeds">
      {company.secondary_okeds.map((item) => {
        const name = pick(item, "name", locale);
        return (
          <li key={item.code}>
            <Link to={`/companies?oked=${item.code}`}>
              {name ? `${item.code} — ${name}` : item.code}
            </Link>
          </li>
        );
      })}
    </ul>
  ) : (
    company.secondary_oked
  );

  const localityParts = locality ? locality.split(", ") : [];
  const district =
    region && company.kato.slice(2, 4) !== "00" ? company.kato.slice(0, 4) : "";

  const localityValue =
    region && localityParts.length > 0 ? (
      <>
        <Link to={`/companies?region=${region}`}>{localityParts[0]}</Link>
        {localityParts.length > 1 && ", "}
        {localityParts.length > 1 &&
          (district ? (
            <Link to={`/companies?region=${region}&district=${district}`}>
              {localityParts[1]}
            </Link>
          ) : (
            localityParts[1]
          ))}
        {localityParts.length > 2 && `, ${localityParts.slice(2).join(", ")}`}
      </>
    ) : (
      locality
    );

  const registeredValue = company.registration_date ? (
    <Link to={`/companies?${monthRange(company.registration_date)}`}>
      {formatDate(company.registration_date)}
    </Link>
  ) : (
    ""
  );

  const addressValue =
    company.legal_address && company.address_id ? (
      <Link to={`/address/${company.address_id}`}>{company.legal_address}</Link>
    ) : (
      company.legal_address
    );

  const directorValue =
    company.director_name && company.director_id ? (
      <Link to={`/director/${company.director_id}`}>
        {company.director_name}
      </Link>
    ) : (
      company.director_name
    );
  const lockedText = t("company.locked");
  const cardImage = `${String(client.defaults.baseURL || "").replace(/\/$/, "")}/og/company/${company.slug_code || code}.png`;

  const description = fitSentences([
    t("company.seoLead", { name: title, bin: company.bin }),
    !locked &&
      company.registration_date &&
      t("company.seoRegistered", {
        date: formatDate(company.registration_date),
      }),
    company.status === "gone"
      ? t("company.seoGone", { date: formatDate(company.last_seen) })
      : t("company.seoActive"),
    activity && t("company.seoActivity", { value: activity }),
    locality && t("company.seoLocation", { value: locality }),
    !locked &&
      company.director_name &&
      t("company.seoDirector", { value: company.director_name }),
  ]);

  const crumbs = [
    { name: t("breadcrumbs.home"), path: "/" },
    { name: t("companies.title"), path: "/companies" },
    { name: title, path: `/company/${company.slug}` },
  ];

  const schema = buildSchema({
    company,
    name: title,
    legalName: primary,
    alternateName: secondary,
    url: `${SITE_URL}${localizePath(locale, `/company/${company.slug}`)}`,
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
        image={cardImage}
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

        <img
          className="company__image"
          src={cardImage}
          alt={title}
          width="1200"
          height="630"
        />

        {!locked && <CompanyDashboard code={code} />}

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
          <Row
            label={t("company.category")}
            value={filterLink(
              "form",
              company.legal_form,
              company.legal_form ? t(`legalForm.${company.legal_form}`) : "",
            )}
            lockedText={lockedText}
          />
          <Row
            label={t("company.oked")}
            value={okedValue}
            lockedText={lockedText}
          />
          <Row
            label={t("company.secondaryOked")}
            value={secondaryValue}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.locality")}
            value={localityValue}
            lockedText={lockedText}
          />
          <Row
            label={t("company.address")}
            value={addressValue}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.director")}
            value={directorValue}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.registered")}
            value={registeredValue}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.size")}
            value={filterLink(
              "krp",
              company.krp_code,
              pick(company, "krp_name", locale),
            )}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.sector")}
            value={filterLink(
              "kse",
              company.kse_code,
              pick(company, "kse_name", locale),
            )}
            locked={locked}
            lockedText={lockedText}
          />
          <Row
            label={t("company.ownership")}
            value={filterLink(
              "kfs",
              company.kfs_code,
              pick(company, "kfs_name", locale),
            )}
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

        <CompanyHistory slug={company.slug} locked={locked} />
      </div>
    </section>
  );
}
