import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import JsonLd from "../../components/seo/JsonLd";
import Breadcrumbs from "../../components/breadcrumbs/Breadcrumbs";
import NotFound from "../notfound/NotFound";
import { SITE_URL } from "../../config/site";
import { shortName } from "../../utils/companyName";
import "./_Company.scss";

const BIN_PATTERN = /^\d{12}$/;

const formatDate = (value) => {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
};

const truncate = (text, max = 160) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

function Row({ label, value, locked }) {
  return (
    <div className="company__row">
      <dt>{label}</dt>
      <dd>
        {locked ? (
          <span className="company__locked">Доступно после регистрации</span>
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}

const buildSchema = (company, name, locked) => {
  const url = `${SITE_URL}/company/${company.bin}`;
  const address = {
    "@type": "PostalAddress",
    addressCountry: "KZ",
    addressLocality: company.locality_ru || undefined,
    streetAddress:
      !locked && company.legal_address ? company.legal_address : undefined,
  };

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${url}#organization`,
    url,
    name,
    legalName: company.name_ru,
    alternateName: company.name_kk || undefined,
    identifier: {
      "@type": "PropertyValue",
      propertyID: "БИН",
      value: company.bin,
    },
    description: company.oked_name_ru
      ? `Вид деятельности: ${company.oked_name_ru}`
      : undefined,
    address: company.locality_ru || !locked ? address : undefined,
    foundingDate:
      !locked && company.registration_date
        ? company.registration_date
        : undefined,
  };
};

export default function Company() {
  const { bin } = useParams();
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
          error: notFound ? "" : "Не удалось загрузить данные",
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
        title="Компания не найдена"
        text="БИН состоит из 12 цифр. Проверьте адрес или воспользуйтесь поиском."
      />
    );
  }

  if (result.bin !== bin) {
    return (
      <section className="company">
        <SEO title={`Компания ${bin}`} noindex />
        Загрузка...
      </section>
    );
  }

  if (result.notFound) {
    return (
      <NotFound
        title="Компания не найдена"
        text={`Компании с БИН ${bin} нет в нашей базе.`}
      />
    );
  }

  if (result.error) {
    return (
      <section className="company">
        <SEO title="Ошибка загрузки" noindex />
        <p className="company__message">{result.error}</p>
      </section>
    );
  }

  const company = result.company;
  const locked = result.access !== "member";
  const name = shortName(company.name_ru);
  const oked = company.oked_code
    ? `${company.oked_code} — ${company.oked_name_ru || ""}`
    : "";
  const description = truncate(
    [
      `${name}, БИН ${company.bin}.`,
      company.oked_name_ru && `Вид деятельности: ${company.oked_name_ru}.`,
      company.locality_ru && `Местонахождение: ${company.locality_ru}.`,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const crumbs = [
    { name: "Главная", path: "/" },
    { name: "Компании", path: "/companies" },
    { name, path: `/company/${company.bin}` },
  ];

  return (
    <section className="company">
      <SEO title={`${name} — БИН ${company.bin}`} description={description} />
      <JsonLd data={buildSchema(company, name, locked)} />
      <div className="company__card">
        <Breadcrumbs items={crumbs} />

        <div className="company__head">
          <div>
            <h1 className="company__name">{name}</h1>
            {name !== company.name_ru && (
              <p className="company__name-kk">{company.name_ru}</p>
            )}
            {company.name_kk && (
              <p className="company__name-kk">{company.name_kk}</p>
            )}
            <p className="company__bin">БИН {company.bin}</p>
          </div>
        </div>

        {locked && (
          <div className="company__notice">
            <p>
              Часть данных скрыта. Зарегистрируйтесь или войдите, чтобы увидеть
              руководителя, адрес, дату регистрации и другие сведения.
            </p>
            <div className="company__notice-actions">
              <Link to="/register" className="company__notice-button">
                Зарегистрироваться
              </Link>
              <Link to="/login" className="company__notice-link">
                Войти
              </Link>
            </div>
          </div>
        )}

        <dl className="company__list">
          <Row label="Вид деятельности (ОКЭД)" value={oked} />
          <Row
            label="Дополнительные ОКЭД"
            value={company.secondary_oked}
            locked={locked}
          />
          <Row label="Населённый пункт" value={company.locality_ru} />
          <Row
            label="Юридический адрес"
            value={company.legal_address}
            locked={locked}
          />
          <Row
            label="Руководитель"
            value={company.director_name}
            locked={locked}
          />
          <Row
            label="Дата регистрации"
            value={formatDate(company.registration_date)}
            locked={locked}
          />
          <Row
            label="Размер предприятия"
            value={company.krp_name_ru}
            locked={locked}
          />
          <Row
            label="Сектор экономики"
            value={company.kse_name_ru}
            locked={locked}
          />
          <Row
            label="Форма собственности"
            value={company.kfs_name_ru}
            locked={locked}
          />
          <Row label="КАТО" value={company.kato} locked={locked} />
        </dl>
      </div>
    </section>
  );
}
