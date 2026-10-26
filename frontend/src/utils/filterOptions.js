import { useEffect, useState } from "react";
import client from "../api/client";

let request = null;
let cached = null;

const load = () => {
  if (!request) {
    request = client
      .get("/company-filters")
      .then(({ data }) => {
        cached = data.data;
        return cached;
      })
      .catch(() => {
        request = null;
        return null;
      });
  }
  return request;
};

export const useFilterOptions = () => {
  const [options, setOptions] = useState(cached);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    load().then((data) => {
      if (!cancelled && data) setOptions(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return options;
};

export const codeLabel = (options, dictionary, code, locale) => {
  if (!code) return "";
  const item = options?.[dictionary]?.find((entry) => entry.code === code);
  if (!item) return code;
  const name =
    locale === "kk"
      ? item.name_kk || item.name_ru
      : item.name_ru || item.name_kk;
  if (!name) return code;
  return dictionary === "oked" ? `${code} — ${name}` : name;
};
