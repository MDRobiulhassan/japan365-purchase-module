function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map((row) =>
    row.map((v) => escapeCSV(String(v ?? ''))).join(',')
  );

  const csv = '\ufeff' + headerLine + '\n' + dataLines.join('\n');
  triggerDownload(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function downloadExcel(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escapeXML = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const headerCells = headers
    .map((h) => `<Cell><Data ss:Type="String">${escapeXML(h)}</Data></Cell>`)
    .join('');

  const dataRows = rows.map((row) => {
    const cells = row
      .map((v) => {
        const str = String(v ?? '');
        const isNum = str !== '' && !isNaN(Number(str));
        return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXML(str)}</Data></Cell>`;
      })
      .join('');
    return `<Row>${cells}</Row>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Export">
  <Table>
   <Row>${headerCells}</Row>
   ${dataRows.join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`;

  triggerDownload(xml, `${filename}.xls`, 'application/vnd.ms-excel');
}
