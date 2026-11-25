import { useEffect, useState } from "react";
import SEO from "../../components/seo/SEO";
import { Link, Navigate } from "../../i18n/router";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import {
  fetchMe,
  updatePhone,
  clearSession,
  errorCode,
} from "../../api/account";
import "./_Profile.scss";

const PHONE_ERRORS = ["INVALID_PHONE", "PHONE_TAKEN"];

const getInitials = (user) => {
  const first = (user.firstName || "").trim()[0] || "";
  const last = (user.lastName || "").trim()[0] || "";
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
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [expired, setExpired] = useState(false);

  const resetSession = () => {
    clearSession();
    navigate("/login");
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetchMe()
      .then((data) => {
        if (cancelled) return;
        setUser(data);
        setPhone(data.phone || "");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 401) {
          clearSession();
          setExpired(true);
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

  if (!token || expired) {
    return <Navigate to="/login" replace />;
  }

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

  if (loadFailed || !user) {
    return (
      <section className="profile">
        <SEO title={t("profile.seoTitle")} noindex />
        <div className="profile__inner">
          <p className="profile__status">{t("profile.loadError")}</p>
        </div>
      </section>
    );
  }

  const dirty = phone !== (user.phone || "");
  const bins = Array.isArray(user.bins) ? user.bins : [];
  const fullName =
    user.fullName || `${user.lastName || ""} ${user.firstName || ""}`.trim();
  const since = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(
        locale === "kk" ? "kk-KZ" : "ru-RU",
        { day: "numeric", month: "long", year: "numeric" },
      )
    : "";

  const handlePhoneChange = (e) => {
    setPhone(e.target.value);
    setMessage(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const next = await updatePhone(phone.trim());
      setUser(next);
      setPhone(next.phone || "");
      setMessage({ type: "success", text: t("profile.saved") });
    } catch (err) {
      if (err.response?.status === 401) {
        resetSession();
        return;
      }
      const code = errorCode(err);
      setMessage({
        type: "error",
        text: t(
          PHONE_ERRORS.includes(code)
            ? `profile.errors.${code}`
            : "profile.saveError",
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="profile">
      <SEO title={t("profile.seoTitle")} noindex />
      <div className="profile__inner">
        <div className="profile__hero">
          <div className="profile__avatar">{getInitials(user)}</div>
          <div className="profile__hero-info">
            <h1 className="profile__name">{fullName}</h1>
            <p className="profile__meta">
              {[`${t("profile.iin")} ${user.iin}`, user.phone]
                .filter(Boolean)
                .join(" · ")}
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
              <p className="profile__card-text">{t("profile.edsHint")}</p>

              <div className="profile__fields">
                <div className="profile__row">
                  <Field label={t("profile.lastName")}>
                    <input
                      className="profile__input"
                      type="text"
                      value={user.lastName || ""}
                      readOnly
                    />
                  </Field>
                  <Field label={t("profile.firstName")}>
                    <input
                      className="profile__input"
                      type="text"
                      value={user.firstName || ""}
                      readOnly
                    />
                  </Field>
                </div>

                <div className="profile__row">
                  <Field label={t("profile.middleName")}>
                    <input
                      className="profile__input"
                      type="text"
                      value={user.middleName || ""}
                      readOnly
                    />
                  </Field>
                  <Field label={t("profile.iin")}>
                    <input
                      className="profile__input"
                      type="text"
                      value={user.iin || ""}
                      readOnly
                    />
                  </Field>
                </div>

                <Field label={t("profile.phone")} hint={t("profile.phoneHint")}>
                  <input
                    className="profile__input"
                    type="tel"
                    name="phone"
                    placeholder="+7 777 123 45 67"
                    value={phone}
                    onChange={handlePhoneChange}
                    autoComplete="tel"
                  />
                </Field>
              </div>

              <Message message={message} />

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
                    onClick={() => setPhone(user.phone || "")}
                  >
                    {t("profile.reset")}
                  </button>
                )}
              </div>
            </form>

            {bins.length > 0 && (
              <div className="profile__card">
                <h2 className="profile__card-title">
                  {t("profile.companiesTitle")}
                </h2>
                <ul className="profile__links">
                  {bins.map((item) => (
                    <li key={item.bin}>
                      {item.organization ? `${item.organization} · ` : ""}
                      {t("profile.bin")} {item.bin}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
