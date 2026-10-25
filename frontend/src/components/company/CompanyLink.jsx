import { Link } from "../../i18n/router";

export default function CompanyLink({ slug, className, children }) {
  if (!slug) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Link to={`/company/${slug}`} className={className}>
      {children}
    </Link>
  );
}
