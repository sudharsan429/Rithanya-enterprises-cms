import React from 'react';
import { Calendar, FileDown, Download } from 'lucide-react';
import DatePicker from 'react-datepicker';
import CustomSelect from '../../../components/CustomSelect';

const ReportControls = ({ 
  user,
  dateType, 
  handleDateTypeChange, 
  dateRange, 
  setDateRange, 
  activeSubTab, 
  setActiveSubTab, 
  subTabs, 
  selectedCanteen, 
  setSelectedCanteen, 
  canteens, 
  selectedProduct, 
  setSelectedProduct, 
  products,
  handleExport,
  handleMonthChange
}) => {
  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-top-4 duration-500">
      
      {/* 1. Main Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 sm:gap-6">
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Period Selection */}
          <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-100 shadow-sm backdrop-blur-sm">
            {[{ id: 'daily', label: 'Today' }, { id: 'monthly', label: 'Month' }, { id: 'custom', label: 'Custom' }].map(t => (
              <button
                key={t.id}
                onClick={() => handleDateTypeChange(t.id)}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                  dateType === t.id 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>


          {/* Monthly Month Picker */}
          {dateType === 'monthly' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 animate-in zoom-in duration-200 overflow-hidden">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <DatePicker 
                selected={dateRange.startDate} 
                onChange={handleMonthChange} 
                className="bg-transparent text-[10px] font-black text-blue-600 w-24 outline-none uppercase tracking-widest cursor-pointer" 
                dateFormat="MMMM yyyy" 
                showMonthYearPicker
                showFullMonthYearPicker
              />
            </div>
          )}
          
          {/* Custom Date Picker (Stacked on small screens) */}
          {dateType === 'custom' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 animate-in zoom-in duration-200 overflow-hidden">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <DatePicker 
                selected={dateRange.startDate} 
                onChange={d => setDateRange(p => ({ ...p, startDate: d }))} 
                className="bg-transparent text-[10px] font-bold text-slate-600 w-16 sm:w-20 outline-none" 
                dateFormat="dd/MM/yy" 
              />
              <span className="text-slate-300">→</span>
              <DatePicker 
                selected={dateRange.endDate} 
                onChange={d => setDateRange(p => ({ ...p, endDate: d }))} 
                className="bg-transparent text-[10px] font-bold text-slate-600 w-16 sm:w-20 outline-none" 
                dateFormat="dd/MM/yy" 
              />
            </div>
          )}

          {/* Entity Selectors (Adapts to mobile widths) */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {(activeSubTab === 'canteen_wise' || activeSubTab === 'production_unit' || activeSubTab === 'canteen') && (
                <div className="w-full sm:w-48 animate-in slide-in-from-left duration-300">
                <CustomSelect 
                   disabled={user?.role === 'salesperson' || user?.role === 'prod_manager'}
                   options={[
                    { value: 'all', label: activeSubTab === 'production_unit' ? 'All Units' : 'All Canteens' }, 
                    ...(Array.isArray(canteens) ? canteens
                        .filter(c => activeSubTab === 'production_unit' ? c.type === 'ProductionUnit' : c.type === 'Canteen')
                        .map(c => ({ value: c._id, label: c.name })) : [])
                   ]} 
                    value={selectedCanteen} 
                    onChange={(val) => setSelectedCanteen(val || 'all')} 
                    placeholder={activeSubTab === 'production_unit' ? 'Unit' : 'Canteen'} 
                />
                </div>
            )}
            {activeSubTab === 'product_wise' && (
                <div className="w-full sm:w-48 animate-in slide-in-from-left duration-300">
                <CustomSelect 
                    options={[{ value: 'all', label: 'All Products' }, ...(Array.isArray(products) ? products.map(p => ({ value: p._id, label: p.name })) : [])]} 
                    value={selectedProduct} 
                    onChange={setSelectedProduct} 
                    placeholder="Product" 
                />
                </div>
            )}
          </div>
        </div>

        {/* 2. Action Buttons (Excel/PDF) - Secondary in bar on mobile */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-50 pt-4 lg:pt-0 lg:border-none mt-2 lg:mt-0">
            <button 
                onClick={() => handleExport('excel')} 
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-[10px] font-bold uppercase text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex-1 sm:flex-none shadow-sm"
            >
                <FileDown className="w-3.5 h-3.5" /> Excel
            </button>
            <button 
                onClick={() => handleExport('pdf')} 
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-[10px] font-bold uppercase text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex-1 sm:flex-none shadow-sm"
            >
                <Download className="w-3.5 h-3.5" /> PDF
            </button>
        </div>
      </div>

      {/* 3. Sub-tabs (Grouping) - Scrollable on mobile */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <div className="flex items-center gap-2 min-w-max">
          {subTabs.map(st => (
            <button
              key={st.id}
              onClick={() => setActiveSubTab(st.id)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all border ${activeSubTab === st.id ? 'bg-primary border-primary text-white shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300 hover:text-slate-600'}`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default ReportControls;
