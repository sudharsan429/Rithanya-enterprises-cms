import React from 'react';
import { IndianRupee, Layers } from 'lucide-react';

const ReportHeader = ({ data, loading }) => {
  const isMulti = !Array.isArray(data) && data?.type === 'multi';
  
  const totalRecords = isMulti 
    ? Object.values(data.results).reduce((sum, canteen) => sum + (canteen.data?.filter(i => !i.isSubtotal).length || 0), 0)
    : (data?.filter(i => !i.isSubtotal).length || 0);

  const totalValue = isMulti
    ? Object.values(data.results).reduce((sum, canteen) => sum + (canteen.paymentSummary?.totalValue || 0), 0)
    : (data?.reduce((sum, item) => sum + (Number(item.total) || 0), 0) || 0);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Reports Audit</h1>
        <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-0.5 sm:mt-1 uppercase tracking-widest">Analytics & Logistics Hub</p>
      </div>

      <div className="flex items-center gap-3 sm:gap-6 bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-2 sm:gap-4 group">
          <div className="p-2 sm:p-2.5 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
          </div>
          <div className="text-right sm:text-left">
            <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase block leading-tight">Records</span>
            <span className="text-sm sm:text-lg font-bold text-slate-900 leading-tight">
              {loading ? <div className="w-6 h-4 bg-slate-50 animate-pulse rounded mt-1" /> : totalRecords}
            </span>
          </div>
        </div>

        <div className="w-px h-8 sm:h-10 bg-slate-100 mx-1 sm:mx-0" />

        <div className="flex items-center gap-2 sm:gap-4 group">
          <div className="p-2 sm:p-2.5 bg-blue-50/50 rounded-lg group-hover:bg-blue-50 transition-colors">
            <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
          </div>
          <div className="text-right sm:text-left">
            <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase block leading-tight">Total Value</span>
            <span className="text-sm sm:text-lg font-bold text-slate-900 leading-tight">
                {loading ? <div className="w-12 h-4 bg-slate-50 animate-pulse rounded mt-1" /> : `₹${totalValue.toLocaleString()}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportHeader;
