import React from 'react';
import { ClipboardList, ArrowRight, CornerDownRight } from 'lucide-react';
import { format } from 'date-fns';

const AuditReport = ({ data, loading, isDailyAudit }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generating Audit Ledger...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
        <ClipboardList className="w-12 h-12 text-slate-200 mx-auto" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Transactions Recorded</p>
      </div>
    );
  }

  const safeFormatDate = (dateStr) => {
    try {
      if (!dateStr) return 'N/A';
      return format(new Date(dateStr), 'dd MMM yyyy HH:mm');
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="p-4 animate-in fade-in duration-500">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-slate-800">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h3 className="font-bold uppercase text-[11px] tracking-widest text-slate-500">
              {isDailyAudit ? 'Daily Sales Audit Ledger' : 'Global Transaction History'}
            </h3>
            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase border border-blue-100">
              System Verified
            </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-100/50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider w-40">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider w-24 text-center">Type</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider">Item Details</th>
                <th className="px-6 py-4 text-[10px) font-black uppercase tracking-wider text-center w-24">Qty</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider">Origin & Destination</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider max-w-[200px]">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((tx, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                    {safeFormatDate(tx?.date)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      tx?.type === 'sale' ? 'bg-green-50 text-green-600 border-green-100' :
                      tx?.type === 'transfer' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      tx?.type === 'return' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {tx?.type || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900 leading-none">{tx?.productName || 'Unknown Item'}</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">SKU: {tx?.productId?.slice(-6) || '---'}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-black text-slate-900">{tx?.qty || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{tx?.from || '---'}</span>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                      <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{tx?.to || '---'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-1">
                        <CornerDownRight className="w-3 h-3 text-slate-300 mt-0.5" />
                        <p className="text-[11px] text-slate-500 font-medium italic leading-relaxed">
                            {tx?.remark || 'No system notes recorded.'}
                        </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditReport;