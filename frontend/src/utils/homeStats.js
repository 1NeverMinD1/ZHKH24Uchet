import { useEffect, useState } from "react";
import client from "../api/client";

let pending = null;

const load = () => {
  if (!pending) {
    pending = Promise.all([
      client.get("/history/stats"),
      client.get("/history/territories"),
    ])
      .then(([stats, territories]) => {
        const list = (stats.data.data.snapshots || []).filter(
          (item) => item.total,
        );
        return {
          last: list[list.length - 1] || null,
          regions: territories.data.data || [],
        };
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
};

export const useHomeStats = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
};
