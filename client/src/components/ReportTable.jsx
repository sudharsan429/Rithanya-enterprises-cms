import React from 'react';

const ReportTable = ({ 
  columns, 
  data, 
  loading 
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {columns.map((col, i) => (
                <th 
                    key={i} 
                    className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50/50">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 italic text-[11px] font-medium tracking-wide">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    Calculating Analytics...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-300 italic text-[11px] font-medium">
                  No records match the current filters.
                </td>
              </tr>
            ) : (
              data.map((item, i) => {
                const isSubtotal = item.isSubtotal;
                const isGrandTotal = item.isGrandTotal;
                
                return (
                    <tr 
                        key={item._id || i} 
                        className={`transition-all duration-200 
                            ${isGrandTotal ? 'bg-slate-900 text-white font-bold' : 
                              isSubtotal ? 'bg-slate-50/50 font-semibold text-slate-900' : 
                              'hover:bg-slate-50/30'}`}
                    >
                        {columns.map((col, j) => (
                            <td 
                                key={j} 
                                className={`px-6 py-4 text-[11px] 
                                    ${isGrandTotal ? 'text-white' : 
                                      isSubtotal ? 'text-slate-900' : 
                                      'text-slate-500 font-medium'}`}
                            >
                                {col.render ? col.render(item) : item[col.key]}
                            </td>
                        ))}
                    </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportTable;
