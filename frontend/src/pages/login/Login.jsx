import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../../api/client";
import "../auth/_Auth.scss";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await client.post("/auth/local", form);
      localStorage.setItem("token", data.jwt);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth">
      <form className="auth__form" onSubmit={handleSubmit}>
        <h1 className="auth__title">Вход</h1>

        <label className="auth__label">
          Email или имя пользователя
          <input
            className="auth__input"
            type="text"
            name="identifier"
            value={form.identifier}
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
            required
          />
        </label>

        {error && <p className="auth__error">{error}</p>}

        <button className="auth__button" type="submit" disabled={loading}>
          {loading ? "Подождите..." : "Войти"}
        </button>

        <p className="auth__footer">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
    </section>
  );
}
