export const CYRILLIC = "АӘБВГҒДЕЁЖЗИІЙКҚЛМНҢОӨПРСТУҰҮФХҺЦЧШЩЪЫЬЭЮЯ".split("");
export const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const DIGITS = ["0"];

export const letterLabel = (letter, t) =>
  letter === "0" ? t("catalog.digits") : letter;

export const letterPath = (letter, page = 1) =>
  `/catalog/letter/${encodeURIComponent(letter)}${page > 1 ? `/${page}` : ""}`;

export const formPath = (form, page = 1) =>
  `/catalog/form/${form}${page > 1 ? `/${page}` : ""}`;
