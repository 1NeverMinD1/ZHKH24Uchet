import { useLocale } from "../../i18n/context";
import "./_Tutorial.scss";

const STEPS = [
  { num: "01", key: "step1" },
  { num: "02", key: "step2" },
  { num: "03", key: "step3" },
];

export default function Tutorial() {
  const { t } = useLocale();

  return (
    <div className="tutorial">
      <h2 className="tutorial__title">{t("tutorial.title")}</h2>
      <div className="tutorial__blocks">
        {STEPS.map((step) => (
          <div className="tutorial__blocks-block" key={step.key}>
            <p className="tutorial__blocks-block-num">{step.num}</p>
            <p className="tutorial__blocks-block-intro">
              {t(`tutorial.${step.key}.title`)}
            </p>
            <p className="tutorial__blocks-block-text">
              {t(`tutorial.${step.key}.text`)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
