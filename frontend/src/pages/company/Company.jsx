import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import client from "../../api/client";
import "./_Company.scss";

const formatDate = (value) => {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
};

function Row({ label, value, locked }) {
  return (
    <div className="company__row">
      <dt>{label}</dt>
      <dd>
        {locked ? (
          <span className="company__locked">Доступно после регистрации</span>
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}

export default function Company() {
  const { bin } = useParams();
  const [result, setResult] = useState({
    bin: null,
    company: null,
    access: "guest",
    error: "",
  });

  useEffect(() => {
    let cancelled = false;

    client
      .get(`/company-card/${bin}`)
      .then(({ data }) => {
        if (cancelled) return;
        setResult({
          bin,
          company: data.data,
          access: data.access,
          error: "",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err.response?.status === 404
            ? "Компания с таким БИН не найдена"
            : "Не удалось загрузить данные";
        setResult({ bin, company: null, access: "guest", error: message });
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
  const locked = result.access !== "member";
  const oked = company.oked_code
    ? `${company.oked_code} — ${company.oked_name_ru || ""}`
    : "";

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
        </div>

        {locked && (
          <div className="company__notice">
            <p>
              Часть данных скрыта. Зарегистрируйтесь или войдите, чтобы увидеть
              руководителя, адрес, дату регистрации и другие сведения.
            </p>
            <div className="company__notice-actions">
              <Link to="/register" className="company__notice-button">
                Зарегистрироваться
              </Link>
              <Link to="/login" className="company__notice-link">
                Войти
              </Link>
            </div>
          </div>
        )}

        <dl className="company__list">
          <Row label="Вид деятельности (ОКЭД)" value={oked} />
          <Row
            label="Дополнительные ОКЭД"
            value={company.secondary_oked}
            locked={locked}
          />
          <Row label="Населённый пункт" value={company.locality_ru} />
          <Row
            label="Юридический адрес"
            value={company.legal_address}
            locked={locked}
          />
          <Row
            label="Руководитель"
            value={company.director_name}
            locked={locked}
          />
          <Row
            label="Дата регистрации"
            value={formatDate(company.registration_date)}
            locked={locked}
          />
          <Row
            label="Размер предприятия"
            value={company.krp_name_ru}
            locked={locked}
          />
          <Row
            label="Сектор экономики"
            value={company.kse_name_ru}
            locked={locked}
          />
          <Row
            label="Форма собственности"
            value={company.kfs_name_ru}
            locked={locked}
          />
          <Row label="КАТО" value={company.kato} locked={locked} />
        </dl>
      </div>
    </section>
  );
}
