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

function KeyIcon({ size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.7 12.3 20 3" />
      <path d="M16 7l3 3" />
      <path d="M18 5l2 2" />
    </svg>
  );
}

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
      <div className="auth__form auth__form--eds">
        <div className="auth__head">
          <span className="auth__icon">
            <KeyIcon size={30} />
          </span>
          <h1 className="auth__title">{t("login.title")}</h1>
          <p className="auth__text">{t("login.edsText")}</p>
        </div>

        <button
          className="auth__button auth__button--eds"
          type="button"
          onClick={handleLogin}
          disabled={loading}
        >
          <KeyIcon size={18} />
          <span>{loading ? t("login.wait") : t("login.edsSubmit")}</span>
        </button>

        {error && (
          <div className="auth__error">
            <span>{t(`login.errors.${error}`)}</span>
            {error === "NCALAYER_NOT_RUNNING" && (
              <a
                href="https://pki.gov.kz/ncalayer/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("login.ncalayerDownload")}
              </a>
            )}
          </div>
        )}
      </div>{" "}
    </section>
  );
}
