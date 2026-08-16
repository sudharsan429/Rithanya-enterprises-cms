import React from 'react';
import { Package, TrendingUp } from 'lucide-react';

const ReturnReport = ({ data, loading, activeSubTab }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generating Return Report...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
        <Package className="w-12 h-12 text-slate-200 mx-auto" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Return Data Found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {data?.map((location, lIdx) => (
        <div key={lIdx} className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden text-slate-800">
          <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 flex items-center justify-between">
            <h3 className="font-bold uppercase text-sm">
              {activeSubTab === 'category_wise' ? 'Category Summary' : `Returned from: ${location?.canteenname}`}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-white px-2 py-1 rounded border border-slate-200">
               Stock Return Audit
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-300 text-slate-700">
                <tr>
                  <th className="px-4 py-2 text-xs font-bold uppercase border-r border-slate-200 w-16 text-center">S.No</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase border-r border-slate-200">Item Name</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase border-r border-slate-200 text-center w-32">Qty Returned</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase border-r border-slate-200 text-right w-36">Impact Value</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase text-center w-32">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {location?.salelist?.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    <tr className="bg-[#FFFF00] border-y border-slate-300">
                      <td colSpan={5} className="px-4 py-2 text-black font-black uppercase text-[10px] tracking-[0.15em] text-center">
                        {group?.category || 'General Items'}
                      </td>
                    </tr>

                    {group?.productlist?.map((item, pIdx) => (
                      <tr key={pIdx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-600 text-center border-r border-slate-200">{pIdx + 1}</td>
                        <td className="px-4 py-2 text-sm border-r border-slate-200 font-medium">{item?.productName || 'Unknown Product'}</td>
                        <td className="px-4 py-2 text-sm text-center border-r border-slate-200 font-bold bg-red-50/10 text-red-600">{item?.qty || 0}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-right border-r border-slate-200">₹{(item?.total || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">
                           <span className="text-[10px] font-bold text-red-500 uppercase px-2 py-0.5 bg-red-50 rounded">Returned</span>
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-slate-50 border-b-2 border-slate-300 font-bold">
                      <td colSpan={2} className="px-4 py-2 border-r border-slate-200"></td>
                      <td className="px-4 py-2 text-sm text-center border-r border-slate-200 uppercase bg-slate-100/50">Category Subtotal</td>
                      <td className="px-4 py-2 text-sm text-right border-r border-slate-200 bg-[#FFFF00]/10">
                        ₹{group?.productlist?.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2"></td>
                    </tr>
                  </React.Fragment>
                ))}

                <tr className="border-t-4 border-slate-400">
                  <td colSpan={5} className="px-0 py-0">
                    <div className="flex justify-end items-center bg-slate-900 p-5 gap-8">
                       <div className="flex items-center gap-2">
                           <div className="p-2 bg-red-500/20 rounded">
                               <TrendingUp className="w-5 h-5 text-red-400 rotate-180" />
                           </div>
                           <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Return Valuation</p>
                               <p className="text-xl font-black text-white leading-none">
                                  ₹{location?.salelist?.reduce((total, group) => 
                                    total + (group?.productlist?.reduce((sum, p) => sum + (p.total || 0), 0) || 0), 0
                                  ).toLocaleString()}
                               </p>
                           </div>
                       </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReturnReport;