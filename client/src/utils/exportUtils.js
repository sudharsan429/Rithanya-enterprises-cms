import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

/**
 * Export report data to Excel (.xlsx)
 * @param {Array} data - The table data
 * @param {Array} columns - Table column definitions
 * @param {String} title - Report title
 * @param {Object} filters - Applied filters for the header
 */
export const exportToExcel = async (data, columns, title, filters) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    // Title Row
    worksheet.mergeCells('A1:G1');
    const titleRow = worksheet.getRow(1);
    titleRow.values = [title.toUpperCase()];
    titleRow.font = { name: 'Arial Black', size: 16, color: { argb: 'FF3B82F6' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Subtitle / Filters Row
    worksheet.mergeCells('A2:G2');
    const subtitleRow = worksheet.getRow(2);
    subtitleRow.values = [`Period: ${format(filters.startDate, 'dd MMM yyyy')} - ${format(filters.endDate, 'dd MMM yyyy')} | Scope: ${filters.scope}`];
    subtitleRow.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
    subtitleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow([]); // Gap

    // Define Columns
    worksheet.columns = columns.map(col => ({
        header: col.header.toUpperCase(),
        key: col.key,
        width: 25
    }));

    // Header Styling
    const headerRow = worksheet.getRow(4);
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        cell.font = { bold: true, color: { argb: 'FF1E293B' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    });

    // Add Data
    data.forEach(item => {
        worksheet.addRow(item);
    });

    // Total Row
    const totalRowIndex = data.length + 5;
    worksheet.addRow({});
    const totalRow = worksheet.getRow(totalRowIndex);
    const totalAmount = data.reduce((sum, item) => sum + (item.total || 0), 0);
    totalRow.getCell(columns.length).value = `GRAND TOTAL: ₹${totalAmount}`;
    totalRow.font = { bold: true };

    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    link.click();
};

/**
 * Export report data to PDF
 * @param {Array} data - The table data
 * @param {Array} columns - Table column definitions
 * @param {String} title - Report title
 * @param {Object} filters - Applied filters for the header
 */
export const exportToPDF = (data, columns, title, filters) => {
    const doc = new jsPDF();

    // Branding Header
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246); // Blue-600
    doc.text('RITHANYA ENTERPRISES', 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(title.toUpperCase(), 14, 30);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    const period = `Date Range: ${format(filters.startDate, 'dd-MM-yyyy')} to ${format(filters.endDate, 'dd-MM-yyyy')}`;
    const scope = `View: ${filters.scope}`;
    doc.text(`${period}  |  ${scope}`, 14, 36);

    // Prepare Table Data
    const tableHeaders = [columns.map(col => col.header)];
    const tableRows = data.map(item => columns.map(col => item[col.key]));

    doc.autoTable({
        startY: 45,
        head: tableHeaders,
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        foot: [[...Array(columns.length - 2).fill(''), 'GRAND TOTAL', `₹${data.reduce((sum, item) => sum + (item.total || 0), 0)}`]],
        footStyles: { fillColor: [248, 250, 252], textColor: [30, 41, 59], fontStyle: 'bold' }
    });

    doc.save(`${title.toLowerCase().replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
