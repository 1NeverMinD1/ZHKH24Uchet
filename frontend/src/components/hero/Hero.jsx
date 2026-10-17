import { useState } from "react";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import Summary from "../summary/Sumary";
import "./_Hero.scss";

const EXAMPLES = ["ЖЕЗКАЗГАНРЕДМЕТ", "030340002448"];

export default function Hero() {
  const navigate = useNavigate();
  const { t } = useLocale();
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
          <span className="hero__badge">{t("hero.badge")}</span>
          <h1 className="hero__title">
            {t("hero.titleStart")}{" "}
            <span className="hero__title-accent">{t("hero.titleAccent")}</span>
          </h1>
          <p className="hero__intro">{t("hero.intro")}</p>

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
              placeholder={t("hero.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="hero__search-button" type="submit">
              {t("hero.button")}
            </button>
          </form>

          <div className="hero__examples">
            <span>{t("hero.try")}</span>
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
