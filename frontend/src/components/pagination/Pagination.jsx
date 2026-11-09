import { Fragment } from "react";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";

export default function Pagination({ page, pages, pathOf }) {
  const { t } = useLocale();
  if (pages <= 1) return null;

  const numbers = [];
  const add = (n) => {
    if (n >= 1 && n <= pages && !numbers.includes(n)) numbers.push(n);
  };
  add(1);
  for (let n = page - 2; n <= page + 2; n += 1) add(n);
  add(pages);
  numbers.sort((a, b) => a - b);

  return (
    <nav className="pagination" aria-label={t("catalog.pagination")}>
      {page > 1 && (
        <Link to={pathOf(page - 1)} className="pagination__link" rel="prev">
          {t("catalog.prev")}
        </Link>
      )}
      {numbers.map((n, index) => (
        <Fragment key={n}>
          {index > 0 && n - numbers[index - 1] > 1 && (
            <span className="pagination__gap">…</span>
          )}
          {n === page ? (
            <span
              className="pagination__link pagination__link--current"
              aria-current="page"
            >
              {n}
            </span>
          ) : (
            <Link to={pathOf(n)} className="pagination__link">
              {n}
            </Link>
          )}
        </Fragment>
      ))}
      {page < pages && (
        <Link to={pathOf(page + 1)} className="pagination__link" rel="next">
          {t("catalog.next")}
        </Link>
      )}
    </nav>
  );
}
