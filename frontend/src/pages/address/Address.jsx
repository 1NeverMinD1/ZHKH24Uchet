import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import Breadcrumbs from "../../components/breadcrumbs/Breadcrumbs";
import NotFound from "../notfound/NotFound";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { shortName } from "../../utils/companyName";
import { formatDate } from "../../utils/dates";
import CompaniesChart from "../../components/history/CompaniesChart";
import "../search/_Search.scss";
import "./_Address.scss";

export default function Address() {
  const { id } = useParams();
  const { locale, t } = useLocale();
  const validId = /^\d+$/.test(id);
  const [date, setDate] = useState("");
  const [data, setData] = useState({
    key: null,
    info: null,
    companies: [],
    total: 0,
    page: 1,
    status: "ok",
  });
  const [loadingMore, setLoadingMore] = useState(false);

  const key = `${id}|${date}`;

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    const requestKey = `${id}|${date}`;

    client
      .get(`/history/address/${id}`, { params: date ? { date } : {} })
      .then(({ data: response }) => {
        if (cancelled) return;
        const info = response.data;
        setData({
          key: requestKey,
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
          key: requestKey,
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
  }, [id, date, validId]);

  const handleLoadMore = async () => {
    const page = data.page + 1;
    setLoadingMore(true);

    try {
      const { data: response } = await client.get(`/history/address/${id}`, {
        params: date ? { date, page } : { page },
      });
      setData((previous) =>
        previous.key === key
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
      <NotFound
        title={t("address.notFound")}
        text={t("address.notFoundText")}
      />
    );
  }

  if (data.key !== key) {
    return (
      <section className="search">
        <SEO title={t("address.title")} noindex />
        <div className="search__inner">
          <p className="search__message">{t("common.loading")}</p>
        </div>
      </section>
    );
  }

  if (data.status === "error" || !data.info) {
    return (
      <section className="search">
        <SEO title={t("address.title")} noindex />
        <div className="search__inner">
          <p className="search__message">{t("address.loadError")}</p>
        </div>
      </section>
    );
  }

  const { info } = data;
  const place = locale === "kk" ? info.placeKk || info.place : info.place;
  const timeline = info.timeline;
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  const difference = last.companies - first.companies;
  const selected = date || info.snapshot?.takenOn || "";

  const crumbs = [
    { name: t("breadcrumbs.home"), path: "/" },
    { name: t("companies.title"), path: "/companies" },
    { name: info.text, path: `/address/${info.id}` },
  ];

  const nameOf = (item) =>
    shortName(
      (locale === "kk"
        ? item.nameKk || item.nameRu
        : item.nameRu || item.nameKk) || "",
    ) || item.bin;

  return (
    <section className="search">
      <SEO
        title={t("address.seoTitle", { address: info.text })}
        description={t("address.seoDescription", { address: info.text })}
        noindex
      />
      <div className="search__inner">
        <Breadcrumbs items={crumbs} />

        <p className="address__eyebrow">{t("address.title")}</p>
        <h1 className="search__title">{info.text}</h1>
        {place && <p className="address__place">{place}</p>}

        <div className="address__card">
          <h2 className="address__subtitle">{t("address.chartTitle")}</h2>
          <CompaniesChart points={timeline} label={t("address.chartTitle")} />

          {timeline.length > 1 && (
            <p className="address__delta">
              {t("address.delta", {
                from: first.companies,
                fromDate: formatDate(first.takenOn),
                to: last.companies,
                toDate: formatDate(last.takenOn),
              })}
              <span
                className={`address__diff${
                  difference > 0
                    ? " address__diff--up"
                    : difference < 0
                      ? " address__diff--down"
                      : ""
                }`}
              >
                {difference > 0 ? `+${difference}` : difference}
              </span>
            </p>
          )}
        </div>

        <div className="address__card">
          <div className="address__head">
            <h2 className="address__subtitle">{t("address.listTitle")}</h2>
            <label className="address__select">
              {t("address.date")}
              <select
                value={selected}
                onChange={(e) => setDate(e.target.value)}
              >
                {timeline.map((point) => (
                  <option key={point.takenOn} value={point.takenOn}>
                    {formatDate(point.takenOn)}
                    {point.isTest ? ` (${t("history.snapshotTest")})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="address__count">
            {t("address.count", { count: data.total.toLocaleString("ru-RU") })}
          </p>

          {data.companies.length === 0 && (
            <p className="search__message">{t("address.empty")}</p>
          )}

          <div className="search__list">
            {data.companies.map((item) => (
              <Link
                key={item.bin}
                to={`/company/${item.bin}`}
                className="search__item"
              >
                <div>
                  <p className="search__item-name">{nameOf(item)}</p>
                  <p className="search__item-meta">
                    {t("company.bin")} {item.bin}
                    {item.unit
                      ? ` · ${t("address.unit", { unit: item.unit })}`
                      : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {data.companies.length < data.total && (
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
