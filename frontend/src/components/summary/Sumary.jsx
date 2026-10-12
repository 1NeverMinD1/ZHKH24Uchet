import "./_Summary.scss";

export default function InfoSummary() {
  return (
    <div className="summary">
      <div className="summary__block">
        <p className="summary__block-intro">1.2 млн+</p>
        <p className="summary__block-text">Компаний и ИП в базе</p>
      </div>
      <div className="summary__block">
        <p className="summary__block-intro">10+</p>
        <p className="summary__block-text">Официальных источников</p>
      </div>
      <div className="summary__block">
        <p className="summary__block-intro">5 лет</p>
        <p className="summary__block-text">Накопленной хронологии</p>
      </div>
      <div className="summary__block">
        <p className="summary__block-intro">30+</p>
        <p className="summary__block-text">Показателей для анализа</p>
      </div>
    </div>
  );
}
