import React from 'react';
import { Package } from 'lucide-react';

const SalesReport = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generating Sales Report...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
        <Package className="w-12 h-12 text-slate-200 mx-auto" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Sales Data for this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {data?.map((canteen, cIdx) => (
        <div key={cIdx} className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
          {/* Canteen Title */}
          <div className="bg-slate-100 border-b border-slate-300 px-4 py-3">
            <h3 className="text-slate-800 font-bold uppercase text-sm">
              {canteen?.canteenname || 'Unknown Location'}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-300 text-slate-700">
                <tr>
                  <th className="px-4 py-2 text-xs font-bold uppercase border-r border-slate-200 w-16 text-center">S.No</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase border-r border-slate-200">Items</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase border-r border-slate-200 text-center w-24">Sales (c)</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase border-r border-slate-200 text-right w-24">Rate</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase border-r border-slate-200 text-right w-36">Sales Value   (in Rs.)</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase text-center w-32">REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {canteen?.salelist?.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    {/* Category Yellow Header Row */}
                    <tr className="bg-[#FFFF00] border-b border-slate-300">
                      <td colSpan={6} className="px-4 py-1.5 text-black font-bold uppercase text-xs tracking-wider text-center border-x border-slate-200">
                        {group?.category || 'General Items'}
                      </td>
                    </tr>

                    {/* Items */}
                    {group?.productlist?.map((item, pIdx) => (
                      <tr key={pIdx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-600 text-center border-r border-slate-200">{pIdx + 1}</td>
                        <td className="px-4 py-2 text-sm text-slate-800 border-r border-slate-200 font-medium">{item?.productName || 'Unknown Product'}</td>
                        <td className="px-4 py-2 text-sm text-slate-800 text-center border-r border-slate-200">{item?.qty || 0}</td>
                        <td className="px-4 py-2 text-sm text-slate-800 text-right border-r border-slate-200">₹{(item?.unitPrice || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-slate-900 text-right border-r border-slate-200 bg-amber-50/10">
                          ₹{(item?.total || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500 text-center italic">{item?.remarks || '-'}</td>
                      </tr>
                    ))}

                    {/* Category Total Row */}
                    <tr className="bg-slate-50 border-b-2 border-slate-300">
                      <td colSpan={3} className="px-4 py-2 border-r border-slate-200"></td>
                      <td className="px-4 py-2 text-sm font-bold text-slate-700 text-right border-r border-slate-200 uppercase">Category Total</td>
                      <td className="px-4 py-2 text-sm font-black text-slate-900 text-right border-r border-slate-200 bg-[#FFFF00]/10">
                        ₹{group?.productlist?.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-center text-xs font-bold text-slate-400">---</td>
                    </tr>
                  </React.Fragment>
                ))}

                {/* Grand Total & Payment Reconciliation */}
                <tr className="border-t-4 border-slate-400">
                  <td colSpan={6} className="px-0 py-0">
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 p-5 gap-6 text-white">
                      {/* Payment Details */}
                      <div className="flex gap-8">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reconciliation:</div>
                        {canteen?.paymentdetails?.map((pay, pIdx) => (
                           <div key={pIdx} className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{pay?.mode}:</span>
                              <span className="text-sm font-black text-white">₹{(pay?.total || 0).toLocaleString()}</span>
                           </div>
                        ))}
                      </div>
                      
                      {/* Grand Total */}
                      <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-700 pt-4 sm:pt-0 sm:pl-8">
                        <div className="text-right">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] block">Grand Total</span>
                            <span className="text-2xl font-black text-white">
                              ₹{(canteen?.paymentdetails?.reduce((sum, p) => sum + (p.total || 0), 0) || 0).toLocaleString()}
                            </span>
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

export default SalesReport;

