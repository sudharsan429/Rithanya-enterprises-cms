import React from 'react';
import { Package } from 'lucide-react';

const MonthlySaleReport = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generating Monthly Report...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
        <Package className="w-12 h-12 text-slate-200 mx-auto" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Monthly Data Available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {data.map((canteen, cIdx) => (
        <div key={cIdx} className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
          {/* Canteen Title */}
          <div className="bg-slate-100 border-b border-slate-300 px-4 py-3">
            <h3 className="text-slate-800 font-bold uppercase text-sm">
              Canteen: {canteen.canteenname}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="bg-slate-50 border-b border-slate-300 text-slate-700">
                <tr>
                  <th className="px-4 py-2 text-xs font-bold uppercase border-r border-slate-200 w-16 text-center">S.No</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase border-r border-slate-200">Date</th>
                  <th className="px-4 py-2 text-xs font-bold uppercase border-r border-slate-200 text-right w-48">Total Revenue (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {canteen.salelist.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    {/* Items */}
                    {group.productlist.map((item, pIdx) => (
                      <tr key={pIdx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-600 text-center border-r border-slate-200">{pIdx + 1}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-slate-800 border-r border-slate-200">
                          {new Date(item.productName).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-slate-900 text-right border-r border-slate-200 bg-amber-50/30">
                          {item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {/* Grand Total & Payment Reconciliation */}
                <tr className="border-t-4 border-slate-400">
                  <td colSpan={3} className="px-0 py-0">
                    <div className="flex justify-between items-center bg-slate-100 p-4">
                      {/* Payment Details */}
                      <div className="flex gap-6">
                        <div className="text-sm font-bold text-slate-600">Reconciliation:</div>
                        {canteen.paymentdetails.map((pay, pIdx) => (
                           <div key={pIdx} className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-500 uppercase">{pay.mode}:</span>
                              <span className="text-sm font-bold text-slate-800">₹{pay.total.toLocaleString()}</span>
                           </div>
                        ))}
                      </div>
                      
                      {/* Grand Total */}
                      <div className="flex items-center gap-4 border-l-2 border-slate-300 pl-6">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grand Total</span>
                        <span className="text-lg font-black text-slate-900">
                          ₹{canteen.paymentdetails.reduce((sum, p) => sum + p.total, 0).toLocaleString()}
                        </span>
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

export default MonthlySaleReport;
