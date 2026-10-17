import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import "./_Search.scss";
import { shortName } from "../../utils/companyName";

export default function Search() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const [result, setResult] = useState({ q: null, items: [], error: "" });

  useEffect(() => {
    if (!q) return;
    let cancelled = false;

    client
      .get("/company-search", { params: { q } })
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
              key={item.bin}
              to={`/company/${item.bin}`}
              className="search__item"
            >
              <div>
                <p className="search__item-name">{shortName(item.name_ru)}</p>
                <p className="search__item-meta">
                  БИН {item.bin}
                  {item.locality_ru ? ` · ${item.locality_ru}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </>
    );
  }

  return (
    <section className="search">
      <SEO title={q ? `Поиск: ${q}` : "Поиск компаний"} noindex />
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
