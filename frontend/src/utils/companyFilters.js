export const KINDS = ["director", "address"];

export const FILTER_KEYS = [
  "changed",
  "from",
  "to",
  "region",
  "district",
  "form",
  "oked",
  "krp",
  "kse",
  "kfs",
  "registered_from",
  "registered_to",
];

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

const HISTORY_KEYS = ["changed", "from", "to"];

export const readFilters = (params) => {
  const values = {};
  for (const key of FILTER_KEYS) {
    const value = (params.get(key) || "").trim();
    if (value) values[key] = value;
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
