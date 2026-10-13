import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import "../search/_Search.scss";

const STATUS_LABELS = {
  active: "Действующая",
  liquidated: "Ликвидирована",
  suspended: "Приостановлена",
};

export default function Companies() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    client
      .get("/company-list", { params: { page: 1 } })
      .then(({ data }) => {
        if (cancelled) return;
        setItems(data.data);
        setTotal(data.meta.total);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Не удалось загрузить список компаний");
      })
      .finally(() => {
        if (cancelled) return;
        setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadMore = async () => {
    const next = page + 1;
    setLoadingMore(true);
    setError("");

    try {
      const { data } = await client.get("/company-list", {
        params: { page: next },
      });
      setItems((prev) => [...prev, ...data.data]);
      setTotal(data.meta.total);
      setPage(next);
    } catch {
      setError("Не удалось загрузить ещё");
    } finally {
      setLoadingMore(false);
    }
  };

  if (initialLoading) {
    return (
      <section className="search">
        <div className="search__inner">
          <p className="search__message">Загрузка...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="search">
      <div className="search__inner">
        <h1 className="search__title">Компании</h1>

        {error && <p className="search__message">{error}</p>}

        {!error && items.length === 0 && (
          <p className="search__message">Пока нет ни одной компании</p>
        )}

        <div className="search__list">
          {items.map((item) => (
            <Link
              key={item.bin}
              to={`/company/${item.bin}`}
              className="search__item"
            >
              <div>
                <p className="search__item-name">{item.name_ru}</p>
                <p className="search__item-meta">
                  БИН {item.bin}
                  {item.okeD_code ? ` · ОКЭД ${item.okeD_code}` : ""}
                </p>
              </div>
              <span
                className={`search__status search__status--${item.company_status}`}
              >
                {STATUS_LABELS[item.company_status] || "—"}
              </span>
            </Link>
          ))}
        </div>

        {items.length < total && (
          <button
            className="search__more"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Загрузка..." : "Показать ещё"}
          </button>
        )}
      </div>
    </section>
  );
}
