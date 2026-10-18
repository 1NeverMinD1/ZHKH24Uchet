import { useState } from "react";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import { Link } from "../../i18n/router";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import { errorKey } from "../../utils/authErrors";
import "../auth/_Auth.scss";

const normalizeIdentifier = (value) => {
  const trimmed = value.trim();
  if (/\p{L}/u.test(trimmed)) return trimmed;
  return trimmed.replace(/[^\d+]/g, "");
};

export default function Login() {
  const navigate = useNavigate();
  const { t } = useLocale();
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
      const { data } = await client.post("/auth/local", {
        identifier: normalizeIdentifier(form.identifier),
        password: form.password,
      });
      localStorage.setItem("token", data.jwt);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(t(errorKey(err.response?.data?.error?.message, "login.error")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth">
      <SEO title={t("login.seoTitle")} noindex />
      <form className="auth__form" onSubmit={handleSubmit}>
        <h1 className="auth__title">{t("login.title")}</h1>

        <label className="auth__label">
          {t("login.identifier")}
          <input
            className="auth__input"
            type="text"
            name="identifier"
            placeholder={t("login.identifierPlaceholder")}
            value={form.identifier}
            onChange={handleChange}
            autoComplete="username"
            required
          />
        </label>

        <label className="auth__label">
          {t("login.password")}
          <input
            className="auth__input"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="auth__error">{error}</p>}

        <button className="auth__button" type="submit" disabled={loading}>
          {loading ? t("login.wait") : t("login.submit")}
        </button>

        <p className="auth__footer">
          {t("login.noAccount")}{" "}
          <Link to="/register">{t("login.toRegister")}</Link>
        </p>
      </form>
    </section>
  );
}
