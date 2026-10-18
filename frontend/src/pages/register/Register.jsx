import { useState } from "react";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import { errorKey } from "../../utils/authErrors";
import "../auth/_Auth.scss";

export default function Register() {
  const navigate = useNavigate();
  const { t } = useLocale();
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
        t(errorKey(err.response?.data?.error?.message, "register.error")),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth">
      <SEO title={t("register.seoTitle")} noindex />
      <form className="auth__form" onSubmit={handleSubmit}>
        <h1 className="auth__title">{t("register.title")}</h1>

        <label className="auth__label">
          {t("register.lastName")}
          <input
            className="auth__input"
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            autoComplete="family-name"
            required
          />
        </label>

        <label className="auth__label">
          {t("register.firstName")}
          <input
            className="auth__input"
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            autoComplete="given-name"
            required
          />
        </label>

        <label className="auth__label">
          {t("register.phone")}
          <input
            className="auth__input"
            type="tel"
            name="phone"
            placeholder="+7 777 123 45 67"
            value={form.phone}
            onChange={handleChange}
            autoComplete="tel"
            required
          />
        </label>

        <label className="auth__label">
          {t("register.email")}
          <input
            className="auth__input"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </label>

        <label className="auth__label">
          {t("register.password")}
          <input
            className="auth__input"
            type="password"
            name="password"
            placeholder={t("register.passwordHint")}
            value={form.password}
            onChange={handleChange}
            minLength={6}
            autoComplete="new-password"
            required
          />
        </label>

        {error && <p className="auth__error">{error}</p>}

        <button className="auth__button" type="submit" disabled={loading}>
          {loading ? t("register.wait") : t("register.submit")}
        </button>

        <p className="auth__footer">
          {t("register.haveAccount")}{" "}
          <Link to="/login">{t("register.toLogin")}</Link>
        </p>
      </form>
    </section>
  );
}
