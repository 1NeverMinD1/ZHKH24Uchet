import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Summary from "../summary/Sumary";
import "./_Hero.scss";

const EXAMPLES = ["КВИН ТРАК", "240140016751"];

export default function Hero() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const goSearch = (value) => {
    const q = value.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    goSearch(query);
  };

  return (
    <section className="hero">
      <div className="hero__inner">
        <div className="hero__content">
          <span className="hero__badge">Открытые данные госреестров РК</span>
          <h1 className="hero__title">
            Проверьте любую компанию Казахстана{" "}
            <span className="hero__title-accent">за 1 минуту</span>
          </h1>
          <p className="hero__intro">
            БИН, руководитель, адрес, вид деятельности — по данным 10+
            официальных государственных источников
          </p>

          <form className="hero__search" onSubmit={handleSubmit}>
            <svg
              className="hero__search-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              className="hero__search-input"
              type="text"
              placeholder="Введите название, БИН или ИИН компании"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="hero__search-button" type="submit">
              Найти
            </button>
          </form>

          <div className="hero__examples">
            <span>Попробуйте:</span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                className="hero__chip"
                type="button"
                onClick={() => goSearch(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="hero__aside">
          <Summary />
        </div>
      </div>
    </section>
  );
}
