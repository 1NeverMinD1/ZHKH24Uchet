import { useEffect, useState } from "react";
import client from "../../api/client";
import { Link } from "../../i18n/router";
import { useLocale } from "../../i18n/context";
import { formatDate } from "../../utils/dates";

const pluralIndex = (n) => {
  const last = n % 10;
  const tens = n % 100;
  if (last === 1 && tens !== 11) return 0;
  if (last >= 2 && last <= 4 && (tens < 12 || tens > 14)) return 1;
  return 2;
};

const plural = (template, count) => {
  const forms = template.split("|");
  return (forms[pluralIndex(count)] ?? forms[0]).replace(
    "#",
    count.toLocaleString("ru-RU"),
  );
};

const number = (value) => Number(value || 0).toLocaleString("ru-RU");

export default function CompanyDashboard({ code }) {
  const { locale, t } = useLocale();
  const [state, setState] = useState({ code: null, data: null });

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    client
      .get(`/company-dashboard/${code}`)
      .then(({ data }) => {
        if (!cancelled) setState({ code, data: data.data });
      })
      .catch(() => {
        if (!cancelled) setState({ code, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (state.code !== code || !state.data) return null;
  const d = state.data;
  const tiles = [];

  if (d.registrationDate && typeof d.ageYears === "number") {
    const years = d.ageYears;
    tiles.push({
      key: "age",
      label: t(d.active ? "dashboard.age" : "dashboard.ageGone"),
      value:
        years >= 1
          ? plural(t("dashboard.years"), years)
          : t("dashboard.lessYear"),
      note:
        d.active || !d.lastSeen
          ? t("dashboard.registered", {
              date: formatDate(d.registrationDate),
            })
          : t("dashboard.registeredGone", {
              from: formatDate(d.registrationDate),
              to: formatDate(d.lastSeen),
            }),
    });
  }

  const totalChanges =
    d.changes.director + d.changes.address + d.changes.name + d.changes.oked;
  tiles.push({
    key: "changes",
    label: t("dashboard.changes"),
    value: number(totalChanges),
    note: t("dashboard.changesNote", d.changes),
  });

  if (d.neighbors && d.neighbors.count > 0) {
    tiles.push({
      key: "neighbors",
      label: t("dashboard.neighbors"),
      value: number(d.neighbors.count),
      to: `/address/${d.neighbors.id}`,
    });
  }

  if (d.director && d.director.count > 0) {
    tiles.push({
      key: "director",
      label: t("dashboard.director"),
      value: number(d.director.count),
      to: `/director/${d.director.id}`,
    });
  }

  if (d.peers && d.peers.total > 0) {
    const enough = d.peers.total >= 10;
    const region =
      locale === "kk"
        ? d.peers.regionKk || d.peers.regionRu
        : d.peers.regionRu || d.peers.regionKk;
    tiles.push({
      key: "peers",
      label: t("dashboard.peers", { oked: d.peers.oked }),
      value: number(d.peers.total),
      note: [
        region,
        enough && d.peers.olderThan !== null && d.peers.olderThan > 0
          ? t("dashboard.peersNote", { pct: d.peers.olderThan })
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
      to: `/companies?${new URLSearchParams({
        oked: d.peers.oked,
        region: d.peers.region,
      }).toString()}`,
    });
    if (enough && d.peers.largerThan !== null && d.peers.largerThan > 0) {
      tiles.push({
        key: "size",
        label: t("dashboard.size"),
        value: `${d.peers.largerThan}%`,
        note: t("dashboard.sizeNote"),
      });
    }
  }

  return (
    <div className="company__dashboard">
      {tiles.map((tile) => {
        const content = (
          <>
            <p className="company__tile-label">{tile.label}</p>
            <p className="company__tile-value">{tile.value}</p>
            {tile.note && <p className="company__tile-note">{tile.note}</p>}
          </>
        );
        return tile.to ? (
          <Link
            key={tile.key}
            to={tile.to}
            className="company__tile company__tile--link"
          >
            {content}
          </Link>
        ) : (
          <div key={tile.key} className="company__tile">
            {content}
          </div>
        );
      })}
    </div>
  );
}
