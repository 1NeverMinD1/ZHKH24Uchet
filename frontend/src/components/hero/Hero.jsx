import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Summary from "../summary/Sumary";
import "./_Hero.scss";

export default function Hero() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="hero">
      <h1 className="hero__title">
        Проверьте любую компанию Казахстана за 1 минуту
      </h1>
      <div className="hero__blocks">
        <div className="hero__blocks-block hero__blocks-info">
          <p className="hero__blocks-info-intro">
            БИН, руководитель, адрес, вид деятельности — по данным 10+
            официальных государственных источников
          </p>
          <form className="hero__blocks-info-search" onSubmit={handleSubmit}>
            <input
              className="hero__blocks-info-search-input"
              placeholder="Введите название, БИН или ИИН компании"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="hero__blocks-info-search-button" type="submit">
              Найти
            </button>
          </form>
        </div>
        <div className="hero__blocks-block">
          <Summary />
        </div>
      </div>
    </div>
  );
}
