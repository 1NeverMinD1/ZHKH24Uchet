import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function useRegistryList(keys, defaults, fetcher) {
  const [params, setParams] = useSearchParams();
  const values = {};
  for (const name of keys) {
    const raw = params.get(name);
    values[name] = raw === null || raw === "" ? (defaults[name] ?? "") : raw;
  }
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const key = JSON.stringify({ ...values, page });

  const [result, setResult] = useState({
    key: null,
    data: null,
    failed: false,
  });
  const [facets, setFacets] = useState({
    cities: [],
    districts: [],
    city: "",
    years: [],
  });

  useEffect(() => {
    let cancelled = false;
    const query = JSON.parse(key);
    fetcher(query)
      .then((data) => {
        if (cancelled) return;
        setResult({ key, data, failed: false });
        setFacets((prev) => ({
          cities:
            Array.isArray(data.cities) && data.cities.length
              ? data.cities
              : prev.cities,
          districts: Array.isArray(data.districts) ? data.districts : [],
          city: query.city || "",
          years:
            Array.isArray(data.years) && data.years.length
              ? data.years
              : prev.years,
        }));
      })
      .catch(() => {
        if (!cancelled) setResult({ key, data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key, fetcher]);

  const update = (next) => {
    const merged = { ...values, page: 1, ...next };
    if ("city" in next) merged.district = "";
    const out = {};
    for (const name of keys) {
      const value = merged[name];
      if (value && value !== defaults[name]) out[name] = String(value);
    }
    if (merged.page > 1) out.page = String(merged.page);
    setParams(out);
  };

  const loading = result.key !== key;
  const data = loading ? null : result.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const districts = facets.city === values.city ? facets.districts : [];

  return {
    values,
    page,
    pages,
    data,
    loading,
    failed: !loading && result.failed,
    cities: facets.cities,
    districts,
    years: facets.years,
    update,
  };
}
