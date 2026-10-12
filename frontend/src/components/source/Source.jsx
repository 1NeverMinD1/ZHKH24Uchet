import "./_Source.scss";

export default function Source() {
  return (
    <div className="info__source">
      <h2 className="info__source-title">Данные из официальных источников</h2>
      <div className="info__source-blocks">
        <p className="info__source-blocks-block">stat.gov.kz</p>
        <p className="info__source-blocks-block">kgd.gov.kz</p>
        <p className="info__source-blocks-block">egov.kz</p>
        <p className="info__source-blocks-block">goszakup.gov.kz</p>
        <p className="info__source-blocks-block">elicense.kz</p>
      </div>
    </div>
  );
}
