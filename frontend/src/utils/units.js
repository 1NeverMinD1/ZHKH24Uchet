export const unitName = (unit, t) => {
  if (!unit) return "";
  if (unit.number) {
    return t(unit.kind === "Ж" ? "unit.kindLiving" : "unit.kindOther", {
      number: unit.number,
    });
  }
  if (unit.floor) return t("unit.floorOnly", { floor: unit.floor });
  return unit.label || "";
};
