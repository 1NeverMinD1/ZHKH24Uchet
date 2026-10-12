import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../../api/client";
import "./_Company.scss";

const STATUS_LABELS = {
  active: "Действующая",
  liquidated: "Ликвидирована",
  suspended: "Приостановлена",
};

const SIZE_LABELS = {
  micro: "Микропредприятие",
  small: "Малое предприятие",
  medium: "Среднее предприятие",
  large: "Крупное предприятие",
};

const formatDate = (value) => {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
};

export default function Company() {
  const { bin } = useParams();
  const [result, setResult] = useState({ bin: null, company: null, error: "" });

  useEffect(() => {
    let cancelled = false;

    client
      .get("/companies", { params: { "filters[bin][$eq]": bin } })
      .then(({ data }) => {
        if (cancelled) return;
        if (data.data.length === 0) {
          setResult({
            bin,
            company: null,
            error: "Компания с таким БИН не найдена",
          });
          return;
        }
        setResult({ bin, company: data.data[0], error: "" });
      })
      .catch(() => {
        if (cancelled) return;
        setResult({
          bin,
          company: null,
          error: "Не удалось загрузить данные",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [bin]);

  if (result.bin !== bin) {
    return <section className="company">Загрузка...</section>;
  }

  if (result.error) {
    return (
      <section className="company">
        <p className="company__message">{result.error}</p>
      </section>
    );
  }

  const company = result.company;
  const status = company.company_status;

  return (
    <section className="company">
      <div className="company__card">
        <div className="company__head">
          <div>
            <h1 className="company__name">{company.name_ru}</h1>
            {company.name_kk && (
              <p className="company__name-kk">{company.name_kk}</p>
            )}
            <p className="company__bin">БИН {company.bin}</p>
          </div>
          <span className={`company__status company__status--${status}`}>
            {STATUS_LABELS[status] || "—"}
          </span>
        </div>

        <dl className="company__list">
          <div className="company__row">
            <dt>Руководитель</dt>
            <dd>{company.director_name || "—"}</dd>
          </div>
          <div className="company__row">
            <dt>Юридический адрес</dt>
            <dd>{company.legal_address_ru || "—"}</dd>
          </div>
          <div className="company__row">
            <dt>Вид деятельности (ОКЭД)</dt>
            <dd>
              {company.okeD_code
                ? `${company.okeD_code} — ${company.okeD_name || ""}`
                : "—"}
            </dd>
          </div>
          <div className="company__row">
            <dt>Дата регистрации</dt>
            <dd>{formatDate(company.registration_date)}</dd>
          </div>
          <div className="company__row">
            <dt>Плательщик НДС</dt>
            <dd>{company.is_vat_payer ? "Да" : "Нет"}</dd>
          </div>
          <div className="company__row">
            <dt>Размер предприятия</dt>
            <dd>{SIZE_LABELS[company.company_size] || "—"}</dd>
          </div>
          <div className="company__row">
            <dt>КАТО</dt>
            <dd>{company.kato || "—"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
