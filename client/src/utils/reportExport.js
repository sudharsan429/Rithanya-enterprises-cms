import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

const flattenData = (data) => {
  const flattened = [];
  data?.forEach(report => {
    const locName = report.canteenname || 'Unknown';
    report.salelist?.forEach(group => {
      group.productlist?.forEach(item => {
        flattened.push({
          location: locName,
          category: group.category || 'General',
          product: item.productName || 'Unknown',
          qty: item.qty || 0,
          total: item.total || 0,
          type: item.type || '-',
          remarks: item.remarks || item.reason || '-'
        });
      });
    });
  });
  return flattened;
};

// EXCEL EXPORT
export const exportToExcel = async (data, reportName = 'Report') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(reportName);

  // 1. Add Company Header
  worksheet.mergeCells('A1:G1');
  const companyCell = worksheet.getCell('A1');
  companyCell.value = 'RITHANYA ENTERPRISES - LOGISTICS AUDIT';
  companyCell.font = { bold: true, size: 14, color: { argb: '1E293B' } };
  companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
  companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };

  // 2. Add Report Metadata
  worksheet.mergeCells('A2:G2');
  const metaCell = worksheet.getCell('A2');
  metaCell.value = `${reportName} | Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`;
  metaCell.font = { italic: true, size: 10, color: { argb: '64748B' } };
  metaCell.alignment = { horizontal: 'center' };

  // 3. Define Columns (Row 4)
  worksheet.getRow(4).values = ['Location / Route', 'Category', 'Product Name', 'Quantity', 'Total Value (Rs.)', 'Type', 'Remarks'];
  worksheet.columns = [
    { key: 'location', width: 30 },
    { key: 'category', width: 20 },
    { key: 'product', width: 30 },
    { key: 'qty', width: 15 },
    { key: 'total', width: 20 },
    { key: 'type', width: 15 },
    { key: 'remarks', width: 40 }
  ];

  // Styling Header (Row 4)
  const headerRow = worksheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
    cell.border = { bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // 4. Add Grouped Data
  data?.forEach(report => {
    const locName = report.canteenname || 'Unknown';
    
    report.salelist?.forEach(group => {
      // Add Category Header Row
      const catRow = worksheet.addRow({ location: `${locName} > ${group.category || 'General'}` });
      worksheet.mergeCells(`A${catRow.number}:G${catRow.number}`);
      catRow.font = { bold: true, size: 11 };
      catRow.alignment = { horizontal: 'center' };
      catRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Yellow
      catRow.getCell(1).border = { bottom: { style: 'thin' }, top: { style: 'thin' } };

      // Add Product Rows
      group.productlist?.forEach(item => {
        worksheet.addRow({
          location: locName,
          category: group.category,
          product: item.productName,
          qty: item.qty,
          total: item.total,
          type: item.type || '-',
          remarks: item.remarks || item.reason || '-'
        });
      });

      // Add Category Subtotal Row
      const subtotal = group.productlist?.reduce((sum, p) => sum + (p.total || 0), 0);
      const subRow = worksheet.addRow({ product: 'Category Subtotal:', total: subtotal });
      subRow.font = { bold: true };
      subRow.getCell('total').numFmt = '₹#,##0.00';
    });
  });

  const totalQty = flattenData(data).reduce((sum, r) => sum + r.qty, 0);
  const totalValue = flattenData(data).reduce((sum, r) => sum + r.total, 0);
  
  worksheet.addRow([]);
  const grandTotalRow = worksheet.addRow({ location: 'GRAND TOTAL', qty: totalQty, total: totalValue });
  grandTotalRow.font = { bold: true, size: 12 };
  grandTotalRow.getCell('total').numFmt = '₹#,##0.00';
  grandTotalRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${reportName}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

// PDF EXPORT
export const exportToPDF = (data, reportName = 'Report') => {
  const doc = new jsPDF('p', 'pt', 'a4');
  
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text('RITHANYA ENTERPRISES', 40, 40);
  
  doc.setFontSize(12);
  doc.text(reportName.toUpperCase(), 40, 60);
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 40, 75);

  const rows = flattenData(data);
  const body = rows.map(r => [
    r.location,
    r.category,
    r.product,
    r.qty,
    `Rs. ${r.total.toFixed(2)}`,
    r.type,
    r.remarks
  ]);

  autoTable(doc, {
    startY: 90,
    head: [['Location', 'Category', 'Product', 'Qty', 'Total', 'Type', 'Remarks']],
    body: body,
    theme: 'grid',
    headStyles: { fillStyle: { argb: '1E293B' }, textColor: 255 },
    styles: { fontSize: 8 }
  });

  doc.save(`${reportName}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
};

// AUDIT TABLE EXPORT (Special handling for flat structure)
export const exportAuditToExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Ledger');
  
    worksheet.mergeCells('A1:G1');
    const companyCell = worksheet.getCell('A1');
    companyCell.value = 'RITHANYA ENTERPRISES - TRANSACTION AUDIT LEDGER';
    companyCell.font = { bold: true, size: 14, color: { argb: '1E293B' } };
    companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };

    worksheet.getRow(3).values = ['Date & Time', 'Type', 'Product', 'Qty', 'From', 'To', 'Remark'];
    worksheet.columns = [
      { key: 'date', width: 25 },
      { key: 'type', width: 15 },
      { key: 'productName', width: 30 },
      { key: 'qty', width: 10 },
      { key: 'from', width: 25 },
      { key: 'to', width: 25 },
      { key: 'remark', width: 40 }
    ];
  
    worksheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
  
    data.forEach(row => {
        worksheet.addRow({
            ...row,
            date: row.date ? format(new Date(row.date), 'dd MMM yyyy HH:mm') : 'N/A'
        });
    });
  
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Audit_Ledger_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
};
