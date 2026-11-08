const GROUPS = {
  12: "state",
  13: "state",
  23: "state",
  19: "private",
  28: "foreign",
  36: "foreign",
  37: "foreign",
  29: "public",
};

export const ownershipOf = (code) => GROUPS[String(code || "").trim()] || "";
