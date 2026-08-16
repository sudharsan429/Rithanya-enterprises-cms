import React, { useState, useMemo, useEffect } from 'react';
import { IndianRupee, ArrowRightLeft, RotateCcw, AlertTriangle, ClipboardList, Package } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

// Modular Components
import ReportHeader from './components/ReportHeader';
import ReportControls from './components/ReportControls';
import SalesReport from './tabs/SalesReport';
import TransferReport from './tabs/TransferReport';
import ReturnReport from './tabs/ReturnReport';
import DamageReport from './tabs/DamageReport';
import AuditReport from './tabs/AuditReport';
import MonthlySaleReport from './tabs/MonthlySaleReport';
import StockReport from './tabs/StockReport';

import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

// Utils
import { exportToExcel, exportToPDF, exportAuditToExcel } from '../../utils/reportExport';

const ReportsPage = () => {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState(user?.role === 'prod_manager' ? 'stock' : 'sales');
  const [activeSubTab, setActiveSubTab] = useState(
    user?.role === 'prod_manager' ? 'production_unit' : 
    (user?.role === 'salesperson' ? 'canteen' : 'all_canteen')
  );
  const [dateType, setDateType] = useState('daily');
  const [dateRange, setDateRange] = useState({
    startDate: startOfDay(new Date()),
    endDate: endOfDay(new Date())
  });
  const [selectedCanteen, setSelectedCanteen] = useState(
    user?.role === 'salesperson' ? (user.assignedCanteen || 'all') : 
    (user?.role === 'prod_manager' ? (user.assignedProductionUnit || 'all') : 'all')
  );
  const [selectedProduct, setSelectedProduct] = useState('all');

  const [canteens, setCanteens] = useState([]);
  const [products, setProducts] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState({ totalCash: 0, totalUpi: 0, totalValue: 0 });

  // Clear data on tab or date changes for stability
  useEffect(() => {
    setData([]);
    setPaymentSummary({ totalCash: 0, totalUpi: 0, totalValue: 0 });
  }, [activeTab, activeSubTab, dateType]);

  const TABS = useMemo(() => {
    const all = [
      { id: 'sales', label: 'Sale', icon: IndianRupee, roles: ['admin', 'superadmin', 'salesperson'] },
      { id: 'transfers', label: 'Transfer', icon: ArrowRightLeft, roles: ['admin', 'superadmin', 'prod_manager', 'salesperson'] },
      { id: 'returns', label: 'Return', icon: RotateCcw, roles: ['admin', 'superadmin', 'salesperson'] },
      { id: 'damage', label: 'Damage', icon: AlertTriangle, roles: ['admin', 'superadmin', 'prod_manager', 'salesperson'] },
      { id: 'audit', label: 'Audit', icon: ClipboardList, roles: ['admin', 'superadmin', 'salesperson'] },
      { id: 'stock', label: 'Stock', icon: Package, roles: ['admin', 'superadmin', 'prod_manager', 'salesperson'] }
    ];
    return all.filter(t => t.roles.includes(user?.role));
  }, [user]);

  const SUB_TABS = useMemo(() => {
    if (activeTab === 'stock') {
      return [
        { id: 'production_unit', label: 'Production Units', roles: ['admin', 'superadmin', 'prod_manager'] },
        { id: 'canteen', label: 'Canteen Stocks', roles: ['admin', 'superadmin', 'salesperson'] }
      ].filter(t => t.roles.includes(user?.role));
    }

    const common = [
      { id: 'all_canteen', label: 'All', roles: ['admin', 'superadmin'] },
      { id: 'canteen_wise', label: 'Canteen Wise', roles: ['admin','superadmin', 'salesperson'] },
      { id: 'product_wise', label: 'Product Wise', roles: ['admin', 'superadmin', 'salesperson', 'prod_manager'] },
      { id: 'category_wise', label: 'Category Wise', roles: ['admin', 'superadmin', 'salesperson', 'prod_manager'] }
    ];
    const filtered = common.filter(t => t.roles.includes(user?.role));
    if (activeTab === 'sales') return [...filtered, { id: 'unsold_product', label: 'Unsold', roles: ['admin', 'superadmin', 'salesperson', 'prod_manager'] }];
    return filtered;
  }, [activeTab, user]);

  const isDailyAudit = activeTab === 'sales' && dateType === 'daily';

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      if (canteens.length === 0) {
        const [lRes, pRes] = await Promise.all([
          api.get('/reports/locations'),
          api.get('/products?limit=1000')
        ]);
        setCanteens(lRes.data || []);
        setProducts(pRes.data.data || []);
      }

      const params = {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        canteenId: selectedCanteen,
        productId: selectedProduct,
        subTab: activeSubTab,
        type: isDailyAudit ? 'Sale' : undefined
      };

      if (user.role === 'salesperson' && user.assignedCanteen) params.canteenId = user.assignedCanteen;
      if (user.role === 'prod_manager' && user.assignedProductionUnit) params.canteenId = user.assignedProductionUnit;

      const endpoint = (activeTab === 'sales' && dateType === 'monthly' && activeSubTab === 'all_canteen') 
        ? '/reports/sales/monthly' 
        : (isDailyAudit ? '/reports/audit' : `/reports/${activeTab}`);
      const res = await api.get(endpoint, { params });
      setData(res.data || []);
      
      if (activeTab === 'sales') {
        const summary = { totalCash: 0, totalUpi: 0, totalValue: 0 };
        res.data.forEach(canteen => {
          canteen.paymentdetails?.forEach(p => {
            if (p.mode === 'CASH') summary.totalCash += p.total;
            if (p.mode === 'UPI') summary.totalUpi += p.total;
          });
        });
        summary.totalValue = summary.totalCash + summary.totalUpi;
        setPaymentSummary(summary);
      }
    } catch (err) {
      console.error('Fetch Report Error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeSubTab, dateRange, selectedCanteen, selectedProduct, user, canteens.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 1. Reset everything when main tab changes
  useEffect(() => {
    setData([]);
    setPaymentSummary({ totalCash: 0, totalUpi: 0, totalValue: 0 });
    setSelectedProduct('all');
    
    // Set default subtab for the new main tab
    if (activeTab === 'stock') {
      setActiveSubTab(user.role === 'salesperson' ? 'canteen' : 'production_unit');
    } else {
      setActiveSubTab(user.role === 'prod_manager' ? 'production_unit' : 
                      (user.role === 'salesperson' ? 'canteen_wise' : 'all_canteen'));
    }
  }, [activeTab, user.role]);

  // 2. Clear data and reset entity selections when sub-tab changes
  useEffect(() => {
    setData([]);
    setPaymentSummary({ totalCash: 0, totalUpi: 0, totalValue: 0 });
    setSelectedProduct('all');

    // Reset canteen to default based on role
    if (user?.role === 'salesperson' && user.assignedCanteen) {
      setSelectedCanteen(user.assignedCanteen);
    } else if (user?.role === 'prod_manager' && user.assignedProductionUnit) {
      setSelectedCanteen(user.assignedProductionUnit);
    } else {
      setSelectedCanteen('all');
    }
  }, [activeSubTab, user?.role, user?.assignedCanteen, user?.assignedProductionUnit]);

  const handleDateTypeChange = (type) => {
    setDateType(type);
    if (type === 'daily') setDateRange({ startDate: startOfDay(new Date()), endDate: endOfDay(new Date()) });
    else if (type === 'monthly') setDateRange({ startDate: startOfMonth(new Date()), endDate: endOfMonth(new Date()) });
  };

  const handleMonthChange = (date) => {
    if (!date) return;
    setDateRange({
      startDate: startOfMonth(date),
      endDate: endOfMonth(date)
    });
  };

  const handleExport = (formatType) => {
    const reportTitle = `${activeTab.toUpperCase()} REPORT - ${activeSubTab.toUpperCase()}`;
    if (activeTab === 'audit') {
       exportAuditToExcel(data);
    } else if (formatType === 'excel') {
       exportToExcel(data, reportTitle);
    } else {
       exportToPDF(data, reportTitle);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-10 sm:pb-20 px-4 sm:px-0 animate-in fade-in duration-500 relative">

      {/* Header & Main Tabs */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between border-b border-slate-100 pb-1">
        <ReportHeader data={data} loading={loading} />

        <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-100 shadow-sm backdrop-blur-sm overflow-x-auto no-scrollbar w-full sm:w-fit mb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                activeTab === tab.id 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === tab.id ? 'text-blue-500' : 'text-slate-300'}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <ReportControls
        user={user}
        dateType={dateType}
        handleDateTypeChange={handleDateTypeChange}
        handleMonthChange={handleMonthChange}
        dateRange={dateRange}
        setDateRange={setDateRange}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        subTabs={SUB_TABS}
        selectedCanteen={selectedCanteen}
        setSelectedCanteen={setSelectedCanteen}
        canteens={canteens}
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        products={products}
        handleExport={handleExport}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500 min-h-[400px]">
        {activeTab === 'sales' && (
          isDailyAudit ? (
             <AuditReport data={data} loading={loading} activeSubTab={activeSubTab} isDailyAudit={isDailyAudit} />
          ) : (dateType === 'monthly' && activeSubTab === 'all_canteen') ? (
             <MonthlySaleReport data={data} loading={loading} />
          ) : (
             <SalesReport 
               data={data} 
               loading={loading} 
               activeSubTab={activeSubTab} 
               paymentSummary={paymentSummary}
             />
          )
        )}
        {activeTab === 'transfers' && <TransferReport data={data} loading={loading} activeSubTab={activeSubTab} />}
        {activeTab === 'returns' && <ReturnReport data={data} loading={loading} activeSubTab={activeSubTab} />}
        {activeTab === 'damage' && <DamageReport data={data} loading={loading} activeSubTab={activeSubTab} />}
        {activeTab === 'audit' && <AuditReport data={data} loading={loading} activeSubTab={activeSubTab} isDailyAudit={isDailyAudit} />}
        {activeTab === 'stock' && <StockReport data={data} loading={loading} activeSubTab={activeSubTab} />}
      </div>
    </div>
  );
};

export default ReportsPage;
