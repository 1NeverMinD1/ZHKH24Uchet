export const KINDS = [
  "appeared",
  "disappeared",
  "name",
  "director",
  "address",
  "oked",
  "secondary_oked",
  "krp",
  "kse",
  "kfs",
];

export const FILTER_KEYS = [
  "changed",
  "from",
  "to",
  "mode",
  "region",
  "district",
  "form",
  "oked",
  "krp",
  "kse",
  "kfs",
  "registered_from",
  "registered_to",
  "sort",
  "status",
];

export const SORTS = ["name_asc", "name_desc", "newest", "oldest"];

export const LEGAL_FORMS = [
  "too",
  "ao",
  "osi",
  "ksk",
  "coop",
  "partnership",
  "gov_institution",
  "gov_enterprise",
  "association",
  "fund",
  "institution",
  "aifc",
  "branch",
  "other",
];

const HISTORY_KEYS = ["changed", "from", "to", "mode"];

export const readFilters = (params) => {
  const values = {};
  for (const key of FILTER_KEYS) {
    const value = (params.get(key) || "").trim();
    if (value) values[key] = value;
  }
  if (values.status && !["gone", "all"].includes(values.status)) {
    delete values.status;
  }
  if (values.mode && values.mode !== "period") {
    delete values.mode;
  }
  if (values.sort && !SORTS.includes(values.sort)) {
    delete values.sort;
  }
  if (values.changed) {
    const changed = values.changed
      .split(",")
      .filter((kind) => KINDS.includes(kind))
      .join(",");
    if (changed) {
      values.changed = changed;
    } else {
      delete values.changed;
    }
  }
  return values;
};

export const listParams = (filters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([key]) => !HISTORY_KEYS.includes(key)),
  );
