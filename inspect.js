const ExcelJS = require('exceljs');
const wb = new ExcelJS.Workbook();

wb.xlsx.readFile('docs/现有模版.xlsm').then(() => {
  // 检查配置设置表
  const settings = wb.getWorksheet('配置设置表');
  console.log('=== 配置设置表 ===');
  settings.eachRow((row, rowNum) => {
    const vals = [];
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      if (cell.value != null) {
        vals.push('C' + colNum + '=' + JSON.stringify(cell.value).substring(0, 60));
      }
    });
    if (vals.length > 0) console.log('R' + rowNum + ': ' + vals.join(' | '));
  });

  console.log('\n=== 表格输出 ===');
  const control = wb.getWorksheet('表格输出');
  control.eachRow((row, rowNum) => {
    const vals = [];
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      if (cell.value != null) {
        vals.push('C' + colNum + '=' + JSON.stringify(cell.value).substring(0, 60));
      }
    });
    if (vals.length > 0) console.log('R' + rowNum + ': ' + vals.join(' | '));
  });

  console.log('\n=== 表名对照 ===');
  const mapping = wb.getWorksheet('表名对照');
  mapping.eachRow((row, rowNum) => {
    const vals = [];
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      if (cell.value != null) {
        vals.push('C' + colNum + '=' + JSON.stringify(cell.value).substring(0, 60));
      }
    });
    if (vals.length > 0) console.log('R' + rowNum + ': ' + vals.join(' | '));
  });

  // 检查一个数据表的结构
  console.log('\n=== 系统表 (前8行) ===');
  const sysSheet = wb.getWorksheet('系统表');
  for (let r = 1; r <= Math.min(8, sysSheet.rowCount); r++) {
    const row = sysSheet.getRow(r);
    const vals = [];
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      if (cell.value != null) {
        vals.push('C' + colNum + '=' + JSON.stringify(cell.value).substring(0, 40));
      }
    });
    if (vals.length > 0) console.log('R' + r + ': ' + vals.join(' | '));
  }
}).catch(e => console.error(e));
