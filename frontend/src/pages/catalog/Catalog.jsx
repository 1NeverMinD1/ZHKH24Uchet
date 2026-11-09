import { useEffect, useState } from "react";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import Breadcrumbs from "../../components/breadcrumbs/Breadcrumbs";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { LEGAL_FORMS } from "../../utils/companyFilters";
import {
  CYRILLIC,
  DIGITS,
  LATIN,
  formPath,
  letterLabel,
  letterPath,
} from "./letters";
import "../search/_Search.scss";
import "./_Catalog.scss";

const number = (value) => Number(value || 0).toLocaleString("ru-RU");

export default function Catalog() {
  const { t } = useLocale();
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    let cancelled = false;
    client
      .get("/catalog-index")
      .then(({ data }) => {
        if (!cancelled) setState({ status: "ok", data: data.data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const crumbs = [
    { name: t("breadcrumbs.home"), path: "/" },
    { name: t("companies.title"), path: "/companies" },
    { name: t("catalog.title"), path: "/catalog" },
  ];

  const letterCounts = Object.fromEntries(
    (state.data?.letters || []).map((item) => [item.letter, item.count]),
  );
  const formCounts = Object.fromEntries(
    (state.data?.forms || []).map((item) => [item.code, item.count]),
  );

  const letterGroup = (letters) => {
    const shown = letters.filter((letter) => letterCounts[letter]);
    if (shown.length === 0) return null;
    return (
      <div className="catalog__letters">
        {shown.map((letter) => (
          <Link
            key={letter}
            to={letterPath(letter)}
            className="catalog__letter"
          >
            <span>{letterLabel(letter, t)}</span>
            <small>{number(letterCounts[letter])}</small>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <section className="search">
      <SEO
        title={t("catalog.seoTitle")}
        description={t("catalog.seoDescription")}
      />
      <div className="search__inner">
        <Breadcrumbs items={crumbs} />
        <h1 className="search__title">{t("catalog.title")}</h1>

        {state.status === "loading" && (
          <p className="search__message">{t("common.loading")}</p>
        )}
        {state.status === "error" && (
          <p className="search__message">{t("companies.loadError")}</p>
        )}

        {state.status === "ok" && (
          <>
            <div className="catalog__section">
              <h2 className="catalog__subtitle">{t("catalog.letters")}</h2>
              {letterGroup(CYRILLIC)}
              {letterGroup(LATIN)}
              {letterGroup(DIGITS)}
            </div>

            <div className="catalog__section">
              <h2 className="catalog__subtitle">{t("catalog.forms")}</h2>
              <div className="catalog__forms">
                {LEGAL_FORMS.filter((code) => formCounts[code]).map((code) => (
                  <Link
                    key={code}
                    to={formPath(code)}
                    className="catalog__form"
                  >
                    {t(`legalForm.${code}`)}
                    <span>{number(formCounts[code])}</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
