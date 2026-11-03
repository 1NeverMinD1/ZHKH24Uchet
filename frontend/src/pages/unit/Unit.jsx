import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import Breadcrumbs from "../../components/breadcrumbs/Breadcrumbs";
import CompaniesChart from "../../components/history/CompaniesChart";
import CompanyLink from "../../components/company/CompanyLink";
import NotFound from "../notfound/NotFound";
import { useLocale } from "../../i18n/context";
import { shortName } from "../../utils/companyName";
import { formatDate } from "../../utils/dates";
import { unitName } from "../../utils/units";
import "../search/_Search.scss";
import "../address/_Address.scss";
import "../director/_Director.scss";

export default function Unit() {
  const { id } = useParams();
  const { locale, t } = useLocale();
  const validId = /^\d+$/.test(id);
  const [data, setData] = useState({
    key: null,
    info: null,
    companies: [],
    total: 0,
    page: 1,
    status: "ok",
  });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;

    client
      .get(`/history/unit/${id}`)
      .then(({ data: response }) => {
        if (cancelled) return;
        const info = response.data;
        setData({
          key: id,
          info,
          companies: info.companies,
          total: info.companiesTotal,
          page: 1,
          status: "ok",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setData({
          key: id,
          info: null,
          companies: [],
          total: 0,
          page: 1,
          status: error.response?.status === 404 ? "notfound" : "error",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [id, validId]);

  const handleLoadMore = async () => {
    const page = data.page + 1;
    setLoadingMore(true);

    try {
      const { data: response } = await client.get(`/history/unit/${id}`, {
        params: { page },
      });
      setData((previous) =>
        previous.key === id
          ? {
              ...previous,
              companies: [...previous.companies, ...response.data.companies],
              page,
            }
          : previous,
      );
    } catch {
      setLoadingMore(false);
      return;
    }

    setLoadingMore(false);
  };

  if (!validId || data.status === "notfound") {
    return (
      <NotFound title={t("unit.notFound")} text={t("unit.notFoundText")} />
    );
  }

  if (data.key !== id) {
    return (
      <section className="search">
        <SEO title={t("unit.title")} noindex />
        <div className="search__inner">
          <p className="search__message">{t("common.loading")}</p>
        </div>
      </section>
    );
  }

  if (data.status === "error" || !data.info) {
    return (
      <section className="search">
        <SEO title={t("unit.title")} noindex />
        <div className="search__inner">
          <p className="search__message">{t("unit.loadError")}</p>
        </div>
      </section>
    );
  }

  const { info } = data;
  const title = unitName(info, t);
  const address = info.address;
  const place =
    locale === "kk" ? address.placeKk || address.place : address.place;
  const canLoadMore =
    data.companies.length < data.total &&
    data.page < (info.maxPage ?? Infinity);

  const crumbs = [
    { name: t("breadcrumbs.home"), path: "/" },
    { name: t("companies.title"), path: "/companies" },
    { name: address.text, path: `/address/${address.id}` },
    { name: title, path: `/unit/${info.id}` },
  ];

  const nameOf = (item) =>
    shortName(
      (locale === "kk"
        ? item.nameKk || item.nameRu
        : item.nameRu || item.nameKk) || "",
    ) || item.bin;

  const seen = (item) =>
    item.firstSeen === item.lastSeen
      ? t("history.card.seenOnce", { date: formatDate(item.firstSeen) })
      : t("history.card.seenRange", {
          from: formatDate(item.firstSeen),
          to: formatDate(item.lastSeen),
        });

  return (
    <section className="search">
      <SEO
        title={t("unit.seoTitle", { unit: title, address: address.text })}
        description={t("unit.seoDescription", {
          unit: title,
          address: address.text,
        })}
        noindex
      />
      <div className="search__inner">
        <Breadcrumbs items={crumbs} />

        <p className="address__eyebrow">{t("unit.title")}</p>
        <h1 className="search__title">{title}</h1>
        <p className="address__place">
          <Link to={`/${locale}/address/${address.id}`}>{address.text}</Link>
          {place ? ` · ${place}` : ""}
          {info.number && info.floor
            ? ` · ${t("unit.floor", { floor: info.floor })}`
            : ""}
        </p>

        <div className="address__card">
          <h2 className="address__subtitle">{t("address.chartTitle")}</h2>
          <CompaniesChart
            points={info.timeline}
            label={t("address.chartTitle")}
          />
          <p className="address__delta">
            {t("unit.current", { count: info.currentCompanies })}
            {" · "}
            {t("unit.total", { total: data.total })}
          </p>
        </div>

        <div className="address__card">
          <h2 className="address__subtitle">{t("unit.listTitle")}</h2>

          <div className="search__list director__list">
            {data.companies.map((item) => (
              <CompanyLink
                key={item.bin}
                slug={item.slug}
                className="search__item"
              >
                <div>
                  <p className="search__item-name">{nameOf(item)}</p>
                  <p className="search__item-meta">
                    {t("company.bin")} {item.bin} · {seen(item)}
                  </p>
                </div>
                <span
                  className={`director__status${
                    item.current ? " director__status--current" : ""
                  }`}
                >
                  {item.current ? t("history.card.current") : t("unit.past")}
                </span>
              </CompanyLink>
            ))}
          </div>

          {canLoadMore && (
            <button
              className="search__more"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? t("common.loading") : t("companies.more")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
