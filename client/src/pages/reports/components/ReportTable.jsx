import React from 'react';

const ReportTable = ({ 
  columns, 
  data, 
  loading 
}) => {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              {columns.map((col, i) => (
                <th 
                    key={i} 
                    className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50/50">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 sm:py-16 text-center text-slate-400 italic text-[11px] font-medium tracking-wide">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    Calculating Analytics...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 sm:py-16 text-center text-slate-300 italic text-[11px] font-medium">
                  No records match the current filters.
                </td>
              </tr>
            ) : (() => {
              let currentCategory = null;
              let serialNo = 0;
              
              return data.map((item, i) => {
                const isSubtotal = item.isSubtotal;
                const isGrandTotal = item.isGrandTotal;
                
                // Detection for Category Header Row (Yellow)
                let headerRow = null;
                if (!isSubtotal && !isGrandTotal && item.categoryName && item.categoryName !== currentCategory) {
                    currentCategory = item.categoryName;
                    serialNo = 0; // Reset serial number for new category
                    headerRow = (
                        <tr key={`h_${i}`} className="bg-[#ffff00] border-y border-slate-900/10 shadow-sm">
                            <td colSpan={columns.length} className="px-4 py-2.5 text-center font-black text-slate-900 uppercase tracking-[0.2em] text-[10px] sm:text-[11px]">
                                {currentCategory}
                            </td>
                        </tr>
                    );
                }

                if (!isSubtotal && !isGrandTotal) serialNo++;

                // Detection for Canteen Header (Audit All mode)
                if (item.isCanteenHeader) {
                    return (
                        <tr key={item._id || i} className="bg-slate-900 text-white font-black">
                            <td colSpan={columns.length} className="px-6 py-4 text-center tracking-[0.5em] text-[12px] uppercase animate-in slide-in-from-top duration-500">
                                {item.productName}
                            </td>
                        </tr>
                    );
                }

                return (
                    <React.Fragment key={item._id || i}>
                        {headerRow}
                        <tr 
                            className={`transition-all duration-200 
                                ${isSubtotal ? 'bg-[#ffa500]/20 font-bold text-slate-900 border-t border-slate-100 italic' : 
                                  isGrandTotal ? 'bg-slate-900 text-white font-black' : 
                                  'hover:bg-slate-50/30'}`}
                        >
                            {columns.map((col, j) => {
                                let content = col.render ? col.render(item) : item[col.key];
                                if (col.header === 'S.No' && !isSubtotal && !isGrandTotal) content = serialNo;
                                if (col.header === 'S.No' && (isSubtotal || isGrandTotal)) content = '';

                                return (
                                    <td 
                                        key={j} 
                                        className={`px-4 sm:px-6 py-2.5 sm:py-3.5 text-[10px] sm:text-[11px] whitespace-nowrap
                                            ${isGrandTotal ? 'text-white' : 
                                              isSubtotal ? 'text-slate-900' : 
                                              'text-slate-600 font-medium font-mono'}`}
                                    >
                                        {content}
                                    </td>
                                );
                            })}
                        </tr>
                    </React.Fragment>
                );
              });
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportTable;
