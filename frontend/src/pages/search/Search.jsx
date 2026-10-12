import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import client from "../../api/client";
import "./_Search.scss";

const STATUS_LABELS = {
  active: "Действующая",
  liquidated: "Ликвидирована",
  suspended: "Приостановлена",
};

export default function Search() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const [result, setResult] = useState({ q: null, items: [], error: "" });

  useEffect(() => {
    if (!q) return;
    let cancelled = false;

    client
      .get("/companies", {
        params: {
          "filters[$or][0][name_ru][$containsi]": q,
          "filters[$or][1][name_kk][$containsi]": q,
          "filters[$or][2][bin][$contains]": q,
          "pagination[pageSize]": 20,
        },
      })
      .then(({ data }) => {
        if (cancelled) return;
        setResult({ q, items: data.data, error: "" });
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ q, items: [], error: "Не удалось выполнить поиск" });
      });

    return () => {
      cancelled = true;
    };
  }, [q]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("q") || "").trim();
    if (!value) return;
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  let content;

  if (!q) {
    content = (
      <p className="search__message">Введите название или БИН компании</p>
    );
  } else if (result.q !== q) {
    content = <p className="search__message">Поиск...</p>;
  } else {
    content = (
      <>
        <h1 className="search__title">Результаты по запросу «{q}»</h1>

        {result.error && <p className="search__message">{result.error}</p>}

        {!result.error && result.items.length === 0 && (
          <p className="search__message">Ничего не найдено</p>
        )}

        <div className="search__list">
          {result.items.map((item) => (
            <Link
              key={item.id}
              to={`/company/${item.bin}`}
              className="search__item"
            >
              <div>
                <p className="search__item-name">{item.name_ru}</p>
                <p className="search__item-meta">
                  БИН {item.bin}
                  {item.legal_address_ru ? ` · ${item.legal_address_ru}` : ""}
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
      </>
    );
  }

  return (
    <section className="search">
      <div className="search__inner">
        <form className="search__form" onSubmit={handleSubmit}>
          <input
            key={q}
            className="search__input"
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Введите название, БИН или ИИН компании"
          />
          <button className="search__button" type="submit">
            Найти
          </button>
        </form>

        {content}
      </div>
    </section>
  );
}
