import { useEffect, useState } from "react";
import axios from "axios";
import "./_App.scss";

const API_URL = "http://localhost:1337/api";

function App() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/companies`)
      .then((response) => {
        const first = response.data.data[0];
        setCompany(first);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="container">Загрузка...</div>;
  if (error) return <div className="container">Ошибка: {error}</div>;
  if (!company) return <div className="container">Компания не найдена</div>;

  return (
    <div className="container">
      <h1>{company.name_ru}</h1>
      <p>
        <strong>БИН:</strong> {company.bin}
      </p>
      <p>
        <strong>Руководитель:</strong> {company.director_name}
      </p>
      <p>
        <strong>Юридический адрес:</strong> {company.legal_address_ru}
      </p>
      <p>
        <strong>КАТО:</strong> {company.kato}
      </p>
      <p>
        <strong>ОКЭД:</strong> {company.okeD_code} — {company.okeD_name}
      </p>
      <p>
        <strong>Статус:</strong> {company.company_status}
      </p>
      <p>
        <strong>Дата регистрации:</strong> {company.registration_date}
      </p>
      <p>
        <strong>Плательщик НДС:</strong> {company.is_vat_payer ? "Да" : "Нет"}
      </p>
      <p>
        <strong>Размер предприятия:</strong> {company.company_size}
      </p>
    </div>
  );
}

export default App;
