import ExcelJS from "exceljs";
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile("/tmp/edge-cases-output.xlsx");

// Look at "복잡한 스키마 테스트 API" sheet
const sheet = wb.getWorksheet("복잡한 스키마 테스트 API");
if (sheet) {
  console.log(`=== Sheet: ${sheet.name} ===`);
  sheet.eachRow((row, rowNumber) => {
    const vals: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const v = row.getCell(i).value?.toString() ?? "";
      if (v) vals.push(`${String.fromCharCode(64+i)}="${v}"`);
    }
    if (vals.length > 0) console.log(`  Row ${rowNumber}: ${vals.join(", ")}`);
  });
}
