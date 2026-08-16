import React from 'react';
import toast from 'react-hot-toast';

const SettlementSection = ({
  paymentMode, totalAmount, subtotal,
  cashReceived, setCashReceived,
  discountValue, setDiscountValue,
  splitCash, setSplitCash,
  changeAmount, splitUPI, onKeyDown
}) => {
  return (
    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
      
      {paymentMode === 'discount' && (
        <div className="flex flex-col gap-1 transition-all">
          <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest ml-1">Discount Amount</p>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-orange-200 focus-within:border-orange-500 transition-all shadow-sm">
            <span className="text-sm font-black text-orange-400">₹</span>
            <input
              type="text"
              className="bg-transparent outline-none font-black text-base text-orange-600 w-full tabular-nums"
              placeholder="0.00"
              value={discountValue}
              onKeyDown={onKeyDown}
              onChange={(e) => {
                const val = e.target.value;
                if (Number(val) <= subtotal) setDiscountValue(val);
                else toast.error('Check Subtotal');
              }}
            />
          </div>
        </div>
      )}

      {paymentMode === 'split' && (
        <div className="grid grid-cols-2 gap-3 pt-1 transition-all">
          <div className="space-y-1 group">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cash Portion</p>
            <div className="relative flex items-center bg-white px-3 py-2 rounded-xl border border-slate-200 focus-within:border-blue-500">
              <span className="mr-1.5 text-slate-300 font-black">₹</span>
              <input
                type="text"
                className="w-full text-base font-black text-slate-900 outline-none bg-transparent tabular-nums"
                value={splitCash}
                onKeyDown={onKeyDown}
                onChange={(e) => {
                  const val = e.target.value;
                  if (Number(val) <= totalAmount) setSplitCash(val);
                }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">UPI Portion</p>
            <div className="bg-white px-3 py-2 rounded-xl border border-indigo-100 flex items-center">
              <span className="text-base font-black text-indigo-600 tabular-nums">₹{splitUPI.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {paymentMode === 'cash' && (
        <div className="flex flex-col gap-1 transition-all">
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest ml-1">Cash Received</p>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-200 focus-within:border-emerald-500 transition-all shadow-sm">
            <span className="text-sm font-black text-emerald-400">₹</span>
            <input
              type="text"
              className="bg-transparent outline-none font-black text-base text-emerald-700 w-full tabular-nums"
              placeholder="0.00"
              value={cashReceived}
              onKeyDown={onKeyDown}
              onChange={(e) => setCashReceived(e.target.value)}
            />
          </div>
          {changeAmount > 0 && (
            <div className="flex justify-between px-1">
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Return Change:</p>
              <p className="text-[10px] font-black text-emerald-600">₹{changeAmount.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center py-1">
        <span className="text-sm font-black text-slate-600 uppercase tracking-tighter">TOTAL AMOUNT</span>
        <div className="text-right">
          <span className="text-2xl font-black tabular-nums text-slate-900 tracking-tighter">
            ₹{totalAmount.toLocaleString()}
          </span>
          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest leading-none mt-0.5">Includes GST (if app.)</p>
        </div>
      </div>
    </div>
  );
};

export default SettlementSection;
