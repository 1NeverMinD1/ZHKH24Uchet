import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import "../auth/_Auth.scss";

export default function Profile() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    email: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const resetSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  useEffect(() => {
    if (!token) return;

    client
      .get("/users/me")
      .then(({ data }) => {
        setForm({
          lastName: data.lastName || "",
          firstName: data.firstName || "",
          phone: data.phone || "",
          email: data.email || "",
        });
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          resetSession();
          return;
        }
        setError("Не удалось загрузить профиль");
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const { data } = await client.put("/user/me", form);
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, ...data }));
      window.dispatchEvent(new Event("user-updated"));
      setForm({
        lastName: data.lastName || "",
        firstName: data.firstName || "",
        phone: data.phone || "",
        email: data.email || "",
      });
      setSuccess("Данные сохранены");
    } catch (err) {
      if (err.response?.status === 401) {
        resetSession();
        return;
      }
      setError(
        err.response?.data?.error?.message || "Не удалось сохранить данные",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="auth">
        <SEO title="Личный профиль" noindex />
        Загрузка...
      </section>
    );
  }

  return (
    <section className="auth">
      <SEO title="Личный профиль" noindex />
      <form className="auth__form" onSubmit={handleSubmit}>
        <h1 className="auth__title">Личный профиль</h1>

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

        {error && <p className="auth__error">{error}</p>}
        {success && <p className="auth__success">{success}</p>}

        <button className="auth__button" type="submit" disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
      </form>
    </section>
  );
}
