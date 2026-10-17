import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import "../auth/_Auth.scss";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const phone = form.phone.replace(/[^\d+]/g, "");

    try {
      const { data } = await client.post("/auth/local/register", {
        username: phone,
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone,
      });
      localStorage.setItem("token", data.jwt);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.error?.message || "Не удалось зарегистрироваться",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth">
      <SEO title="Регистрация" noindex />
      <form className="auth__form" onSubmit={handleSubmit}>
        <h1 className="auth__title">Регистрация</h1>

        <label className="auth__label">
          Фамилия
          <input
            className="auth__input"
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            required
          />
        </label>

        <label className="auth__label">
          Имя
          <input
            className="auth__input"
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
          />
        </label>

        <label className="auth__label">
          Номер телефона
          <input
            className="auth__input"
            type="tel"
            name="phone"
            placeholder="+7 777 123 45 67"
            value={form.phone}
            onChange={handleChange}
            required
          />
        </label>

        <label className="auth__label">
          Email
          <input
            className="auth__input"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <label className="auth__label">
          Пароль
          <input
            className="auth__input"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            minLength={6}
            required
          />
        </label>

        {error && <p className="auth__error">{error}</p>}

        <button className="auth__button" type="submit" disabled={loading}>
          {loading ? "Подождите..." : "Зарегистрироваться"}
        </button>

        <p className="auth__footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </section>
  );
}
