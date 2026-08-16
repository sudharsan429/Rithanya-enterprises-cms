import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

/**
 * Advanced Strategy-Based Report Generation (Today, Month, Custom)
 */

// 1. DATA NORMALIZATION STRATEGY
const fixRates = (items) => items.map(i => {
    const rateVal = i.rate || i.unitPrice || 0;
    const qtyVal = i.totalSale || i.qty || 0;
    return { 
        ...i, 
        rate: rateVal,
        unitPrice: rateVal,
        totalSaleValue: qtyVal * rateVal,
        total: i.total || (qtyVal * rateVal)
    };
});

// 2. EXCEL EXPORT (Multi-Sheet)
export const exportToExcel = async (data, columns, title, filters) => {
    const workbook = new ExcelJS.Workbook();
    let itemsToProcess = (data.type === 'multi') ? Object.entries(data.results) : [[title, { data }]];

    for (let canteen of data) {
        const sheetId = canteen.canteenname.replace(/[\[\]\*\?\/\\]/g, '').substring(0, 31);
        const worksheet = workbook.addWorksheet(sheetId);

        // Company Branding
        const colCount = columns.length;
        const reportDate = filters.startDate ? format(new Date(filters.startDate), 'dd.MM.yyyy') : '';

        // Line 1: Company Name
        worksheet.mergeCells(1, 1, 1, colCount);
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'RITHANYA ENTERPRISES';
        titleCell.font = { bold: true, size: 14 };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 22;

        // Line 2: Report Date
        const dateRow = worksheet.addRow([`Canteen Daily Report - ${reportDate}`]);
        worksheet.mergeCells(dateRow.number, 1, dateRow.number, colCount);
        dateRow.getCell(1).font = { bold: true, size: 11 };
        dateRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(dateRow.number).height = 18;

        // Line 3: Canteen Name (Highlight and Center)
        const canteenRow = worksheet.addRow([canteen.canteenname.toUpperCase()]);
        worksheet.mergeCells(canteenRow.number, 1, canteenRow.number, colCount);
        canteenRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF000000' } };
        canteenRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }; // Light Gray
        canteenRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(canteenRow.number).height = 22;

        worksheet.addRow([]); 

        // Data Rendering
        canteen.salelist.forEach(group => {
            // Category Yellow Header (strict bounds)
            const catRow = worksheet.addRow([group.category.toUpperCase()]);
            catRow.font = { bold: true, color: { argb: 'FF000000' } };
            for(let i=1; i<=colCount; i++) {
                catRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Pure Yellow
                catRow.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            }
            worksheet.mergeCells(catRow.number, 1, catRow.number, colCount);
            catRow.getCell(1).alignment = { horizontal: 'center' };

            // Table Header
            const headerRow = worksheet.addRow(columns.map(col => col.header.toUpperCase()));
            headerRow.font = { bold: true, color: { argb: 'FF000000' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
            for(let i=1; i<=colCount; i++) {
                headerRow.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            }
            headerRow.getCell(1).alignment = { horizontal: 'center' };
            headerRow.getCell(3).alignment = { horizontal: 'center' };
            headerRow.getCell(4).alignment = { horizontal: 'right' };
            headerRow.getCell(5).alignment = { horizontal: 'right' };

            // Products / Daily Rows
            group.productlist.forEach((p, idx) => {
                const rowData = columns.map(c => {
                    if (c.key === 'sno') return idx + 1;
                    if (c.key === 'productName' && columns.length === 3) return new Date(p.productName).toLocaleDateString('en-IN'); // Format Date
                    if (c.key === 'productName') return p.productName.toUpperCase();
                    if (c.key === 'total' || c.key === 'unitPrice' || c.key === 'qty') return p[c.key];
                    return p[c.key] || '-';
                });

                const row = worksheet.addRow(rowData);
                for(let i=1; i<=colCount; i++) {
                    row.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                }
                
                row.getCell(1).alignment = { horizontal: 'center' };
                if (columns.length > 3) {
                    row.getCell(3).alignment = { horizontal: 'center' };
                    row.getCell(4).numFmt = '0.00';
                    row.getCell(4).alignment = { horizontal: 'right' };
                    row.getCell(5).numFmt = '#,##0.00';
                    row.getCell(5).alignment = { horizontal: 'right' };
                } else {
                    row.getCell(3).numFmt = '#,##0.00';
                    row.getCell(3).alignment = { horizontal: 'right' };
                }
            });

            // Category Total
            const catTotal = group.productlist.reduce((sum, p) => sum + p.total, 0);
            const totalRow = worksheet.addRow([]);
            totalRow.getCell(1).value = 'TOTAL';
            totalRow.getCell(colCount - 1).value = catTotal;
            worksheet.mergeCells(totalRow.number, 1, totalRow.number, colCount - 2);
            
            for(let i=1; i<=colCount; i++) {
                totalRow.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                totalRow.getCell(i).font = { bold: true };
                if (i <= colCount - 2 || i === colCount) {
                    totalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                } else if (i === colCount - 1) {
                    totalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA500' } }; // Amber orange
                }
            }
            totalRow.getCell(1).alignment = { horizontal: 'right' };
            totalRow.getCell(colCount - 1).numFmt = '#,##0.00';
            totalRow.getCell(colCount - 1).alignment = { horizontal: 'right' };
            worksheet.addRow([]);
        });

        // Payment Summary
        const psTitleRow = worksheet.addRow(['PAYMENT SUMMARY']);
        psTitleRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.mergeCells(psTitleRow.number, 1, psTitleRow.number, 2);
        for(let i=1; i<=2; i++) {
           psTitleRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
           psTitleRow.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        }
        psTitleRow.getCell(1).alignment = { horizontal: 'center' };

        canteen.paymentdetails.forEach(p => {
            const row = worksheet.addRow([p.mode, `Rs. ${p.total.toLocaleString()}`]);
            row.getCell(1).border = { left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };
            row.getCell(1).font = { bold: true };
            row.getCell(2).border = { left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };
        });
        
        const grandTotal = canteen.paymentdetails.reduce((sum, p) => sum + p.total, 0);
        const gtRow = worksheet.addRow(['GRAND TOTAL', `Rs. ${grandTotal.toLocaleString()}`]);
        gtRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        for(let i=1; i<=2; i++) {
           gtRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
           gtRow.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        }

        worksheet.columns.forEach(column => { column.width = 20; });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/ /g, '_')}.xlsx`;
    link.click();
};

// 3. PDF EXPORT (Strategy-Based Template Dispatcher)
export const exportToPDF = (data, columns, title, filters) => {
    // Strategy: Change Layout based on Report Type
    const isMonthly = filters.dateType === 'monthly';
    const isDaily = filters.dateType === 'daily';
    const orientation = (isMonthly || columns.length > 10) ? 'l' : 'p';
    
    const doc = new jsPDF(orientation, 'mm', 'a4');
    let itemsToProcess = (data.type === 'multi') ? Object.entries(data.results) : [[title, { data }]];

    let firstItem = true;
    for (let canteen of data) {
        if (!firstItem) doc.addPage();
        firstItem = false;

        // --- SECTION: Header Template ---
        doc.setTextColor(0); 
        doc.setFont('helvetica', 'bold');
        const reportDate = filters.startDate ? format(new Date(filters.startDate), 'dd.MM.yyyy') : '';
        
        // Line 1: Company Name
        doc.setFontSize(16);
        doc.text('RITHANYA ENTERPRISES', doc.internal.pageSize.width / 2, 16, { align: 'center' });

        // Line 2: Report Title & Date
        doc.setFontSize(11);
        doc.text(`Canteen Daily Report - ${reportDate}`, doc.internal.pageSize.width / 2, 23, { align: 'center' });
        
        // Line 3: Canteen Name (Highlight / Centered)
        doc.setFillColor(235, 235, 235); // Light Gray
        doc.rect(14, 27, doc.internal.pageSize.width - 28, 8, 'F');
        doc.setFontSize(12);
        doc.text(canteen.canteenname.toUpperCase(), doc.internal.pageSize.width / 2, 32.5, { align: 'center' });

        // --- SECTION: Data Rendering (Unified Single Table) ---
        let startY = 40;
        let allRows = [];

        canteen.salelist.forEach((group) => {
            // Category Yellow Header
            allRows.push([
                { content: group.category.toUpperCase(), colSpan: columns.length, styles: { halign: 'center', fillColor: [255, 255, 0], textColor: 0, fontStyle: 'bold' } }
            ]);

            // Items / Daily Rows
            group.productlist.forEach((p, idx) => {
                const rowData = columns.map(c => {
                    if (c.key === 'sno') return idx + 1;
                    if (c.key === 'productName' && columns.length === 3) return new Date(p.productName).toLocaleDateString('en-IN');
                    if (c.key === 'productName') return p.productName.toUpperCase();
                    if (c.key === 'total' || c.key === 'unitPrice') return p[c.key].toFixed(2);
                    if (c.key === 'qty') return p.qty;
                    return p[c.key] || '-';
                });
                allRows.push(rowData);
            });

            // Add Category Total Row
            const categoryTotal = group.productlist.reduce((sum, p) => sum + p.total, 0);
            allRows.push([
                { content: 'TOTAL', colSpan: columns.length - 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 245, 245] } },
                { content: categoryTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 165, 0] } }, // Amber/Orange
                { content: '', styles: { fillColor: [245, 245, 245] } }
            ]);
        });

        // Dynamic Columns Styles based on schema length
        const colStyles = columns.length > 3 ? {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'right', cellWidth: 25 },
            4: { halign: 'right', cellWidth: 35 },
            5: { cellWidth: 35 }
        } : {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 'auto', halign: 'center' },
            2: { cellWidth: 40, halign: 'right' }
        };

        // Render the unified table
        autoTable(doc, {
            startY: startY,
            head: [columns.map(c => c.header.toUpperCase())],
            body: allRows,
            theme: 'grid',
            headStyles: { fillColor: [245, 245, 245], textColor: 0, lineWidth: 0.1, fontSize: 8, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3, textColor: 20 },
            columnStyles: colStyles,
            didParseCell: function (data) {
                if (data.section === 'head' && columns.length > 3) {
                    if (data.column.index === 0 || data.column.index === 2) data.cell.styles.halign = 'center';
                    if (data.column.index === 3 || data.column.index === 4) data.cell.styles.halign = 'right';
                }
                if (data.section === 'head' && columns.length === 3) {
                    if (data.column.index === 0 || data.column.index === 1) data.cell.styles.halign = 'center';
                    if (data.column.index === 2) data.cell.styles.halign = 'right';
                }
            }
        });
        
        startY = doc.lastAutoTable.finalY + 10;

        // --- SECTION: Payment Summary ---
        if (startY + 30 > doc.internal.pageSize.height) { doc.addPage(); startY = 20; }
        
        const summaryRows = canteen.paymentdetails.map(p => [
            { content: p.mode, styles: { fontStyle: 'bold' } }, 
            `Rs. ${p.total.toLocaleString()}`
        ]);
        const grandTotal = canteen.paymentdetails.reduce((sum, p) => sum + p.total, 0);
        summaryRows.push([
            { content: 'GRAND TOTAL', styles: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: 255 } }, 
            { content: `Rs. ${grandTotal.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: 255 } }
        ]);

        autoTable(doc, {
            startY: startY,
            head: [[{ content: 'PAYMENT SUMMARY', colSpan: 2, styles: { halign: 'center', fillColor: [0, 0, 0], textColor: 255, fontStyle: 'bold' } }]],
            body: summaryRows,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3, textColor: 0 },
            columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 60 } }
        });
    }

    doc.save(`${title.toLowerCase().replace(/ /g, '_')}.pdf`);
};
