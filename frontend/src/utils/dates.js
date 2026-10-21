export const formatDate = (value) => {
  if (!value) return "";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
};
