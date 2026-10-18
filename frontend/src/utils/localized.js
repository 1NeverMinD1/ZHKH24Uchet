export const pick = (item, base, locale) => {
  if (!item) return "";
  const order = locale === "kk" ? ["kk", "ru"] : ["ru", "kk"];

  for (const code of order) {
    const value = item[`${base}_${code}`];
    if (value) return value;
  }

  return "";
};
