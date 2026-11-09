import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import Breadcrumbs from "../../components/breadcrumbs/Breadcrumbs";
import CompanyLink from "../../components/company/CompanyLink";
import Pagination from "../../components/pagination/Pagination";
import NotFound from "../notfound/NotFound";
import { useLocale } from "../../i18n/context";
import { shortName } from "../../utils/companyName";
import { pick } from "../../utils/localized";
import { formPath, letterLabel, letterPath } from "./letters";
import "../search/_Search.scss";
import "./_Catalog.scss";

const number = (value) => Number(value || 0).toLocaleString("ru-RU");

export default function CatalogList({ mode }) {
  const { letter = "", form = "", page: pageParam } = useParams();
  const { locale, t } = useLocale();

  const validPage =
    pageParam === undefined || /^[2-9]\d*$|^1\d+$/.test(pageParam);
  const page = pageParam === undefined ? 1 : Number(pageParam);
  const value = mode === "letter" ? letter.toUpperCase() : form;
  const key = `${mode}|${value}|${page}`;

  const [state, setState] = useState({
    key: null,
    items: [],
    meta: null,
    status: "loading",
  });

  useEffect(() => {
    if (!validPage) return;
    let cancelled = false;
    const params =
      mode === "letter" ? { letter: value, page } : { form: value, page };

    client
      .get("/catalog-list", { params })
      .then(({ data }) => {
        if (cancelled) return;
        setState({ key, items: data.data, meta: data.meta, status: "ok" });
        window.scrollTo(0, 0);
      })
      .catch((error) => {
        if (cancelled) return;
        const status = error.response?.status;
        setState({
          key,
          items: [],
          meta: null,
          status: status === 404 || status === 400 ? "notfound" : "error",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [key, mode, value, page, validPage]);

  if (!validPage || (state.key === key && state.status === "notfound")) {
    return <NotFound />;
  }

  const heading =
    mode === "letter"
      ? t("catalog.letterTitle", { letter: letterLabel(value, t) })
      : t(`legalForm.${value}`);
  const seoTitle =
    page > 1 ? `${heading}, ${t("catalog.page", { page })}` : heading;
  const pathOf = (n) =>
    mode === "letter" ? letterPath(value, n) : formPath(value, n);

  const crumbs = [
    { name: t("breadcrumbs.home"), path: "/" },
    { name: t("companies.title"), path: "/companies" },
    { name: t("catalog.title"), path: "/catalog" },
    { name: heading, path: pathOf(1) },
  ];

  const loaded = state.key === key && state.status === "ok";
  const total = loaded ? state.meta.total : 0;
  const description =
    mode === "letter"
      ? t("catalog.letterDescription", {
          letter: letterLabel(value, t),
          count: number(total),
        })
      : t("catalog.formDescription", { form: heading, count: number(total) });

  return (
    <section className="search">
      <SEO title={seoTitle} description={description} />
      <div className="search__inner">
        <Breadcrumbs items={crumbs} />
        <h1 className="search__title">{seoTitle}</h1>

        {!loaded && state.status !== "error" && (
          <p className="search__message">{t("common.loading")}</p>
        )}
        {state.key === key && state.status === "error" && (
          <p className="search__message">{t("companies.loadError")}</p>
        )}

        {loaded && (
          <>
            <p className="catalog__meta">
              {t("catalog.count", { count: number(total) })} ·{" "}
              {t("catalog.pageOf", { page, pages: state.meta.pages })}
            </p>

            <div className="search__list">
              {state.items.map((item) => {
                const locality = pick(item, "locality", locale);
                return (
                  <CompanyLink
                    key={item.bin}
                    slug={item.slug}
                    className="search__item"
                  >
                    <div>
                      <p className="search__item-name">
                        {shortName(pick(item, "name", locale)) || item.bin}
                      </p>
                      <p className="search__item-meta">
                        {t("company.bin")} {item.bin}
                        {locality ? ` · ${locality}` : ""}
                        {item.status === "gone"
                          ? ` · ${t("company.gone")}`
                          : ""}
                      </p>
                    </div>
                  </CompanyLink>
                );
              })}
            </div>

            <Pagination page={page} pages={state.meta.pages} pathOf={pathOf} />
          </>
        )}
      </div>
    </section>
  );
}
