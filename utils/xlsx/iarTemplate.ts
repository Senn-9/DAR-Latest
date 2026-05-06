import * as XLSX from 'xlsx-js-style';

interface IARData {
  fund_cluster: string;
  supplier: string;
  iar_no: string;
  iar_date: string;
  po_no: string;
  office_section: string;
  responsibility_center_code: string;
  invoice_no: string;
  invoice_date: string;
  po_items: Array<{
    stock_no: string;
    unit: string;
    description: string;
    quantity: string;
    unit_price: string;
    subtotal: string;
  }>;
  inspected_at: string;
  received_at: string;
  inspection_verified: boolean;
  items_complete: boolean;
  inspection_officer: string;
  supply_officer: string;
}

export function buildIARXLSX(data: IARData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([]);

  // Common cell style
  const baseStyle = {
    font: { name: 'Times New Roman', sz: 11 },
    alignment: { vertical: 'center', wrapText: true },
  };

  const boldStyle = {
    ...baseStyle,
    font: { name: 'Times New Roman', sz: 11, bold: true },
  };

  const headerStyle = {
    ...boldStyle,
    font: { name: 'Times New Roman', sz: 14, bold: true },
    alignment: { vertical: 'center', horizontal: 'center' },
  };

  const borderStyle = {
    ...baseStyle,
    border: {
      top: { style: 'thin', color: { auto: 1 } },
      bottom: { style: 'thin', color: { auto: 1 } },
      left: { style: 'thin', color: { auto: 1 } },
      right: { style: 'thin', color: { auto: 1 } },
    },
  };

  const headerBorderStyle = {
    ...boldStyle,
    border: {
      top: { style: 'thin', color: { auto: 1 } },
      bottom: { style: 'thin', color: { auto: 1 } },
      left: { style: 'thin', color: { auto: 1 } },
      right: { style: 'thin', color: { auto: 1 } },
    },
    alignment: { vertical: 'center', horizontal: 'center' },
  };

  // Row 1: Appendix 62 (right-aligned)
  ws['A1'] = { v: '', s: baseStyle };
  ws['K1'] = { v: 'Appendix 62', s: { ...baseStyle, alignment: { horizontal: 'right' } } };

  // Row 2: Title (centered, bold)
  ws['A2'] = { v: '', s: baseStyle };
  ws['A2'].s = baseStyle;
  ws['K2'] = { v: 'INSPECTION AND ACCEPTANCE REPORT', s: headerStyle };
  // Merge cells for title
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 10 } });

  // Row 3: Empty
  ws['A3'] = { v: '', s: baseStyle };

  // Row 4: Entity Name | Fund Cluster
  ws['A4'] = { v: 'Entity Name : DEPARTMENT OF AGRARIAN REFORM-CAM SUR 1', s: boldStyle };
  ws['K4'] = { v: `Fund Cluster : ${data.fund_cluster}`, s: boldStyle };

  // Row 5: Supplier | IAR No.
  ws['A5'] = { v: `Supplier : ${data.supplier}`, s: baseStyle };
  ws['K5'] = { v: `IAR No. : ${data.iar_no}`, s: baseStyle };

  // Row 6: PO No./Date | Date
  ws['A6'] = { v: `PO No./Date : ${data.po_no}`, s: baseStyle };
  ws['K6'] = { v: `Date : ${data.iar_date}`, s: baseStyle };

  // Row 7: Requisitioning Office/Dept. | Invoice No.
  ws['A7'] = { v: `Requisitioning Office/Dept. : ${data.office_section}`, s: baseStyle };
  ws['K7'] = { v: `Invoice No. : ${data.invoice_no}`, s: baseStyle };

  // Row 8: Responsibility Center Code | Date
  ws['A8'] = { v: `Responsibility Center Code : ${data.responsibility_center_code}`, s: baseStyle };
  ws['K8'] = { v: `Date : ${data.invoice_date}`, s: baseStyle };

  // Row 9: Empty
  ws['A9'] = { v: '', s: baseStyle };

  // Row 10: Table headers
  const headers = ['Property No.', 'Stock/', 'Unit', 'Description', 'Quantity', 'Unit Cost', 'Amount'];
  headers.forEach((header, i) => {
    const cell = String.fromCharCode(65 + i) + '10';
    ws[cell] = { v: header, s: headerBorderStyle };
  });

  // Merge Stock/ and Unit (columns B and C)
  ws['!merges'].push({ s: { r: 9, c: 1 }, e: { r: 9, c: 2 } });

  // PO Items data rows
  let rowIndex = 11;
  data.po_items.forEach((item) => {
    ws[`A${rowIndex}`] = { v: item.stock_no, s: borderStyle };
    ws[`B${rowIndex}`] = { v: item.unit, s: borderStyle };
    ws[`C${rowIndex}`] = { v: '', s: borderStyle }; // Empty merged cell
    ws[`D${rowIndex}`] = { v: item.description, s: borderStyle };
    ws[`E${rowIndex}`] = { v: item.quantity, s: { ...borderStyle, alignment: { horizontal: 'right' } } };
    ws[`F${rowIndex}`] = { v: item.unit_price, s: { ...borderStyle, alignment: { horizontal: 'right' } } };
    ws[`G${rowIndex}`] = { v: item.subtotal, s: { ...borderStyle, alignment: { horizontal: 'right' } } };
    
    // Merge B and C for each item row
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: rowIndex - 1, c: 1 }, e: { r: rowIndex - 1, c: 2 } });
    rowIndex++;
  });

  // Add empty rows to match template spacing
  for (let i = 0; i < 3; i++) {
    ws[`A${rowIndex}`] = { v: '', s: baseStyle };
    rowIndex++;
  }

  // INSPECTION | ACCEPTANCE section
  ws['A' + rowIndex] = { v: 'INSPECTION', s: boldStyle };
  ws['G' + rowIndex] = { v: 'ACCEPTANCE', s: boldStyle };
  rowIndex++;

  // Inspection and Acceptance details
  ws['A' + rowIndex] = { v: `Date Inspected : ${data.inspected_at}`, s: baseStyle };
  ws['G' + rowIndex] = { v: `Date Received : ${data.received_at}`, s: baseStyle };
  rowIndex++;

  // Empty row
  ws['A' + rowIndex] = { v: '', s: baseStyle };
  rowIndex++;

  // Inspection verification checkboxes
  ws['A' + rowIndex] = { v: 'Inspected, verified and found in order as to quantity', s: baseStyle };
  ws['G' + rowIndex] = { v: 'Complete', s: baseStyle };
  if (data.inspection_verified) {
    ws['A' + rowIndex].v = '☑ Inspected, verified and found in order as to quantity';
  }
  if (data.items_complete) {
    ws['G' + rowIndex].v = '☑ Complete';
  }
  rowIndex++;

  ws['A' + rowIndex] = { v: 'and specifications', s: baseStyle };
  ws['G' + rowIndex] = { v: 'Partial (pls. specify quantity)', s: baseStyle };
  if (!data.items_complete) {
    ws['G' + rowIndex].v = '☑ Partial (pls. specify quantity)';
  }
  rowIndex++;

  // Empty row
  ws['A' + rowIndex] = { v: '', s: baseStyle };
  rowIndex++;

  // Signatures
  ws['A' + rowIndex] = { v: data.inspection_officer, s: boldStyle };
  ws['G' + rowIndex] = { v: data.supply_officer, s: boldStyle };
  rowIndex++;

  ws['A' + rowIndex] = { v: 'Inspection Officer/Inspection Committee', s: baseStyle };
  ws['G' + rowIndex] = { v: 'ARPT/SUPPLY OFFICER', s: baseStyle };

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // A - Property No.
    { wch: 8 },  // B - Stock/
    { wch: 6 },  // C - Unit
    { wch: 30 }, // D - Description
    { wch: 10 }, // E - Quantity
    { wch: 12 }, // F - Unit Cost
    { wch: 12 }, // G - Amount
  ];

  // Set row heights
  const rowHeights: { [key: string]: number } = {};
  for (let i = 1; i <= rowIndex; i++) {
    rowHeights[i] = 20;
  }
  ws['!rows'] = Object.entries(rowHeights).map(([r, h]) => ({ hpt: h }));

  XLSX.utils.book_append_sheet(wb, ws, 'IAR');
  return wb;
}

export function downloadIARXLSX(data: IARData, filename: string = 'IAR.xlsx') {
  const wb = buildIARXLSX(data);
  XLSX.writeFile(wb, filename);
}
