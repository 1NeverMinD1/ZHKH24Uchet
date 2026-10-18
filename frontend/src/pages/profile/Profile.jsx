import { useEffect, useState } from "react";
import client from "../../api/client";
import SEO from "../../components/seo/SEO";
import { Link, Navigate } from "../../i18n/router";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import { errorKey } from "../../utils/authErrors";
import "./_Profile.scss";

const EMPTY_PASSWORDS = {
  currentPassword: "",
  password: "",
  passwordConfirmation: "",
};

const toForm = (data) => ({
  lastName: data.lastName || "",
  firstName: data.firstName || "",
  phone: data.phone || "",
  email: data.email || "",
});

const getInitials = (form) => {
  const first = form.firstName.trim()[0] || "";
  const last = form.lastName.trim()[0] || "";
  return (last + first).toUpperCase() || "?";
};

function Field({ label, hint, children }) {
  return (
    <label className="profile__field">
      <span className="profile__label">{label}</span>
      {children}
      {hint && <span className="profile__hint">{hint}</span>}
    </label>
  );
}

function Message({ message }) {
  if (!message) return null;
  return (
    <p className={`profile__msg profile__msg--${message.type}`}>
      {message.text}
    </p>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const [token] = useState(() => localStorage.getItem("token"));
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(toForm({}));
  const [createdAt, setCreatedAt] = useState("");
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [personalMsg, setPersonalMsg] = useState(null);
  const [passwordMsg, setPasswordMsg] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    client
      .get("/users/me")
      .then(({ data }) => {
        if (cancelled) return;
        const next = toForm(data);
        setSaved(next);
        setForm(next);
        setCreatedAt(data.createdAt || "");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const dirty =
    saved !== null && Object.keys(form).some((key) => form[key] !== saved[key]);

  const resetSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("user-updated"));
    navigate("/login");
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setPersonalMsg(null);
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setPasswordMsg(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setPersonalMsg(null);
    setSaving(true);

    try {
      const { data } = await client.put("/user/me", form);
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, ...data }));
      window.dispatchEvent(new Event("user-updated"));
      const next = toForm(data);
      setSaved(next);
      setForm(next);
      setPersonalMsg({ type: "success", text: t("profile.saved") });
    } catch (err) {
      if (err.response?.status === 401) {
        resetSession();
        return;
      }
      setPersonalMsg({
        type: "error",
        text: t(
          errorKey(err.response?.data?.error?.message, "profile.saveError"),
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (passwords.password.length < 6) {
      setPasswordMsg({ type: "error", text: t("profile.passwordShort") });
      return;
    }
    if (passwords.password !== passwords.passwordConfirmation) {
      setPasswordMsg({ type: "error", text: t("profile.passwordMismatch") });
      return;
    }

    setChanging(true);

    try {
      const { data } = await client.post("/auth/change-password", passwords);
      if (data.jwt) {
        localStorage.setItem("token", data.jwt);
      }
      setPasswords(EMPTY_PASSWORDS);
      setPasswordMsg({ type: "success", text: t("profile.passwordChanged") });
    } catch (err) {
      if (err.response?.status === 401) {
        resetSession();
        return;
      }
      setPasswordMsg({
        type: "error",
        text: t(
          errorKey(err.response?.data?.error?.message, "profile.passwordError"),
        ),
      });
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return (
      <section className="profile">
        <SEO title={t("profile.seoTitle")} noindex />
        <div className="profile__inner">
          <p className="profile__status">{t("common.loading")}</p>
        </div>
      </section>
    );
  }

  if (loadFailed || !saved) {
    return (
      <section className="profile">
        <SEO title={t("profile.seoTitle")} noindex />
        <div className="profile__inner">
          <p className="profile__status">{t("profile.loadError")}</p>
        </div>
      </section>
    );
  }

  const fullName = `${saved.lastName} ${saved.firstName}`.trim();
  const since = createdAt
    ? new Date(createdAt).toLocaleDateString(
        locale === "kk" ? "kk-KZ" : "ru-RU",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        },
      )
    : "";

  return (
    <section className="profile">
      <SEO title={t("profile.seoTitle")} noindex />
      <div className="profile__inner">
        <div className="profile__hero">
          <div className="profile__avatar">{getInitials(saved)}</div>
          <div className="profile__hero-info">
            <h1 className="profile__name">{fullName || saved.phone}</h1>
            <p className="profile__meta">
              {[saved.phone, saved.email].filter(Boolean).join(" · ")}
            </p>
            {since && (
              <p className="profile__since">
                {t("profile.memberSince", { date: since })}
              </p>
            )}
          </div>
        </div>

        <div className="profile__grid">
          <aside className="profile__side">
            <div className="profile__card profile__card--access">
              <h2 className="profile__card-title">
                {t("profile.accessTitle")}
              </h2>
              <p className="profile__card-text">{t("profile.accessText")}</p>
            </div>

            <div className="profile__card">
              <h2 className="profile__card-title">{t("profile.linksTitle")}</h2>
              <ul className="profile__links">
                <li>
                  <Link to="/companies">{t("profile.linkCompanies")}</Link>
                </li>
                <li>
                  <Link to="/search">{t("profile.linkSearch")}</Link>
                </li>
              </ul>
            </div>

            <button
              className="profile__logout"
              type="button"
              onClick={resetSession}
            >
              {t("profile.logout")}
            </button>
          </aside>

          <div className="profile__main">
            <form className="profile__card" onSubmit={handleSave}>
              <h2 className="profile__card-title">{t("profile.personal")}</h2>
              <p className="profile__card-text">{t("profile.personalHint")}</p>

              <div className="profile__fields">
                <div className="profile__row">
                  <Field label={t("profile.lastName")}>
                    <input
                      className="profile__input"
                      type="text"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleFormChange}
                      autoComplete="family-name"
                      required
                    />
                  </Field>
                  <Field label={t("profile.firstName")}>
                    <input
                      className="profile__input"
                      type="text"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleFormChange}
                      autoComplete="given-name"
                      required
                    />
                  </Field>
                </div>

                <Field label={t("profile.phone")} hint={t("profile.phoneHint")}>
                  <input
                    className="profile__input"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    autoComplete="tel"
                    required
                  />
                </Field>

                <Field label={t("profile.email")}>
                  <input
                    className="profile__input"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    autoComplete="email"
                    required
                  />
                </Field>
              </div>

              <Message message={personalMsg} />

              <div className="profile__actions">
                <button
                  className="profile__button"
                  type="submit"
                  disabled={saving || !dirty}
                >
                  {saving ? t("profile.saving") : t("profile.save")}
                </button>
                {dirty && (
                  <button
                    className="profile__button profile__button--ghost"
                    type="button"
                    onClick={() => setForm(saved)}
                  >
                    {t("profile.reset")}
                  </button>
                )}
              </div>
            </form>

            <form className="profile__card" onSubmit={handlePasswordSubmit}>
              <h2 className="profile__card-title">{t("profile.security")}</h2>
              <p className="profile__card-text">{t("profile.securityHint")}</p>

              <div className="profile__fields">
                <Field label={t("profile.currentPassword")}>
                  <input
                    className="profile__input"
                    type="password"
                    name="currentPassword"
                    value={passwords.currentPassword}
                    onChange={handlePasswordChange}
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <div className="profile__row">
                  <Field label={t("profile.newPassword")}>
                    <input
                      className="profile__input"
                      type="password"
                      name="password"
                      value={passwords.password}
                      onChange={handlePasswordChange}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </Field>
                  <Field label={t("profile.confirmPassword")}>
                    <input
                      className="profile__input"
                      type="password"
                      name="passwordConfirmation"
                      value={passwords.passwordConfirmation}
                      onChange={handlePasswordChange}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </Field>
                </div>
              </div>

              <Message message={passwordMsg} />

              <div className="profile__actions">
                <button
                  className="profile__button"
                  type="submit"
                  disabled={changing}
                >
                  {changing
                    ? t("profile.changing")
                    : t("profile.changePassword")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
