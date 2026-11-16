import ExcelJS from "exceljs";

const [bin, ...files] = process.argv.slice(2);

const plain = (value) => {
  if (value && typeof value === "object") {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value) return value.text;
    if ("result" in value) return value.result;
  }
  return value;
};

for (const file of files) {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(file, {
    sharedStrings: "cache",
    worksheets: "emit",
  });
  let header = null;
  let found = false;

  for await (const sheet of reader) {
    for await (const row of sheet) {
      const values = (row.values || []).slice(1).map(plain);
      if (
        !header &&
        values.some(
          (value) => typeof value === "string" && /БИН|BIN/i.test(value),
        )
      ) {
        header = values;
      }
      if (values.some((value) => String(value ?? "").trim() === bin)) {
        console.log(`\n${file}`);
        values.forEach((value, index) => {
          console.log(`  ${header?.[index] ?? index}: ${value ?? ""}`);
        });
        found = true;
      }
    }
  }

  if (!found) console.log(`\n${file}: БИН не найден`);
}
