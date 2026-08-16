/**
 * Advanced Dispatcher Reporting Engine
 * Strategy-based Column Schemas and Generation logic for Daily, Monthly, and Custom reports
 */
import { exportToExcel, exportToPDF } from './exportUtils';
import toast from 'react-hot-toast';

export const generateReport = ({
    formatType,
    activeTab,
    activeSubTab,
    dateType,
    dateRange,
    selectedCanteen,
    processedData,
    paymentSummary,
    isDailyAudit
}) => {
    // 1. Source Data (Purely from State as per user request)
    const exportData = processedData;
    if (!exportData || (Array.isArray(exportData) && !exportData.length)) {
        return toast.error('No data available to export');
    }

    // 2. Specialized Column Schemas per Reporting Strategy
    let exportTitle = '';

    // Title Strategy
    if (isDailyAudit) {
        exportTitle = selectedCanteen === 'all' ? 'ALL CANTEENS DAILY AUDIT' : 'DAILY CANTEEN AUDIT';
    } else if (dateType === 'monthly') {
        const period = dateRange.startDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        exportTitle = `RITHANYA ENTERPRISES MONTHLY REPORT - ${period.toUpperCase()}`;
    } else {
        exportTitle = `${activeTab.toUpperCase()} REPORT`;
    }

    // Column Strategy based on Tab
    let qtyHeader = 'QTY';
    let valueHeader = 'TOTAL VALUE (RS)';
    
    if (activeTab === 'sales') {
        qtyHeader = 'SOLD (QTY)';
        valueHeader = 'SALES VALUE (Rs.)';
    } else if (activeTab === 'transfers') {
        qtyHeader = 'TRANSFERRED (QTY)';
    } else if (activeTab === 'returns') {
        qtyHeader = 'RETURNED (QTY)';
    } else if (activeTab === 'damage') {
        qtyHeader = 'DAMAGED (QTY)';
    }

    let exportCols = [
        { header: 'S.NO', key: 'sno' },
        { header: 'PRODUCT ITEM', key: 'productName' },
        { header: qtyHeader, key: 'qty' },
        { header: 'RATE', key: 'unitPrice' },
        { header: valueHeader, key: 'total' },
        { header: 'REMARKS', key: 'remarks' }
    ];

    if (activeTab === 'sales' && dateType === 'monthly') {
        exportCols = [
            { header: 'S.NO', key: 'sno' },
            { header: 'DATE', key: 'productName' },
            { header: 'TOTAL REVENUE (RS)', key: 'total' }
        ];
    }

    // 3. Resolve Metadata
    const filters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        scope: activeSubTab,
        paymentSummary: (activeTab === 'sales' || isDailyAudit) ? paymentSummary : null,
        dateType,
        companyName: 'RITHANYA ENTERPRISES'
    };

    // 4. Trigger Generation (PDF will auto-detect dateType and pick correct template)
    if (formatType === 'excel') exportToExcel(exportData, exportCols, exportTitle, filters);
    else exportToPDF(exportData, exportCols, exportTitle, filters);
};
