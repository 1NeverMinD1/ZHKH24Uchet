import { useLocale } from "../../i18n/context";
import { shortName } from "../../utils/companyName";
import { codeLabel, useFilterOptions } from "../../utils/filterOptions";

const CODE_FIELDS = [
  ["oked", "oked", "oked"],
  ["secondary_oked", "secondaryOked", null],
  ["krp", "krp", "krp"],
  ["kse", "kse", "kse"],
  ["kfs", "kfs", "kfs"],
];

export default function ChangeLines({ item }) {
  const { locale, t } = useLocale();
  const options = useFilterOptions();
  const nobody = t("history.nobody");

  const nameOf = (name) =>
    name
      ? shortName(
          (locale === "kk" ? name.kk || name.ru : name.ru || name.kk) || "",
        )
      : nobody;

  const addressOf = (address) => {
    if (!address) return nobody;
    const place = locale === "kk" ? address.placeKk : address.place;
    return [address.text, place].filter(Boolean).join(", ");
  };

  const codeOf = (dictionary, value) => {
    if (!value) return nobody;
    if (!dictionary) return value.split(",").join(", ");
    return codeLabel(options, dictionary, value, locale);
  };

  const line = (kind, from, to) => (
    <p key={kind} className="change__line">
      <span className="change__tag">{t(`history.tag.${kind}`)}</span>
      <span className="change__was">{from}</span>
      <span className="change__arrow">→</span>
      <span>{to}</span>
    </p>
  );

  const changes = item.changes || [];

  const mark = (kind) => (
    <p key={kind} className="change__line">
      <span className="change__tag">{t(`history.tag.${kind}`)}</span>
    </p>
  );

  return (
    <>
      {changes.includes("appeared") && mark("appeared")}
      {changes.includes("disappeared") && mark("disappeared")}
      {changes.includes("name") &&
        line("name", nameOf(item.name?.from), nameOf(item.name?.to))}
      {changes.includes("director") &&
        line(
          "director",
          item.director?.from?.name || nobody,
          item.director?.to?.name || nobody,
        )}
      {changes.includes("address") &&
        line(
          "address",
          addressOf(item.address?.from),
          addressOf(item.address?.to),
        )}
      {CODE_FIELDS.map(
        ([kind, field, dictionary]) =>
          changes.includes(kind) &&
          line(
            kind,
            codeOf(dictionary, item[field]?.from),
            codeOf(dictionary, item[field]?.to),
          ),
      )}
    </>
  );
}
