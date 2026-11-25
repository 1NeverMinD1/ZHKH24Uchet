import { useState } from "react";
import SEO from "../../components/seo/SEO";
import { useNavigate } from "../../i18n/useNavigate";
import { useLocale } from "../../i18n/context";
import { loginWithEds, errorCode } from "../../api/account";
import "../auth/_Auth.scss";

const KNOWN_ERRORS = [
  "NCALAYER_NOT_RUNNING",
  "NCALAYER_CLOSED",
  "NCALAYER_ERROR",
  "CHALLENGE_EXPIRED",
  "SIGNATURE_INVALID",
  "CERT_NOT_FOUND",
  "CERT_INVALID",
  "NOT_AUTH_KEY",
  "CERT_REVOKED",
  "IIN_NOT_FOUND",
  "USER_BLOCKED",
  "NCANODE_UNAVAILABLE",
];

export default function Login() {
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { user } = await loginWithEds(locale);
      navigate(user && user.phone ? "/" : "/profile");
    } catch (err) {
      const code = errorCode(err);
      if (code !== "CANCELED") {
        setError(KNOWN_ERRORS.includes(code) ? code : "DEFAULT");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth">
      <SEO title={t("login.seoTitle")} noindex />
      <div className="auth__form">
        <h1 className="auth__title">{t("login.title")}</h1>
        <p className="auth__footer">{t("login.edsText")}</p>

        {error && <p className="auth__error">{t(`login.errors.${error}`)}</p>}
        {error === "NCALAYER_NOT_RUNNING" && (
          <p className="auth__footer">
            <a
              href="https://pki.gov.kz/ncalayer/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("login.ncalayerDownload")}
            </a>
          </p>
        )}

        <button
          className="auth__button"
          type="button"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? t("login.wait") : t("login.edsSubmit")}
        </button>
      </div>
    </section>
  );
}
