/**
 * Utility functions for exporting table data to CSV and Excel format
 */

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

/**
 * Download tabular data as a CSV file
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvLines: string[] = [];

  // Header row
  csvLines.push(headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));

  // Data rows
  rows.forEach((row) => {
    csvLines.push(row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','));
  });

  const csvContent = csvLines.join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download tabular data as an Excel (.xls) XML spreadsheet
 */
export function downloadExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Export">
<Table>
<Row>`;

  headers.forEach((h) => {
    xml += `<Cell><Data ss:Type="String">${escapeXml(String(h))}</Data></Cell>`;
  });
  xml += `</Row>`;

  rows.forEach((row) => {
    xml += `<Row>`;
    row.forEach((val) => {
      const type = typeof val === 'number' ? 'Number' : 'String';
      xml += `<Cell><Data ss:Type="${type}">${escapeXml(String(val ?? ''))}</Data></Cell>`;
    });
    xml += `</Row>`;
  });

  xml += `</Table></Worksheet></Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
