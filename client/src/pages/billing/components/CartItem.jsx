import React from 'react';
import { Minus, Plus, Trash2, Calendar, Scissors } from 'lucide-react';

const CartItem = React.memo(({ item, onUpdate, onRemove }) => {
  const isOldBatch = React.useMemo(() => {
    if (!item.dailyStockDate) return false;
    const batchDate = new Date(item.dailyStockDate).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    return batchDate < today;
  }, [item.dailyStockDate]);

  const toggleHalfPrice = () => {
    const currentPrice = item.priceAtSale;
    const originalPrice = item.originalPrice;
    
    if (currentPrice === originalPrice / 2) {
      onUpdate(item.productId, item.dailyStockId, 'priceAtSale', originalPrice);
    } else {
      onUpdate(item.productId, item.dailyStockId, 'priceAtSale', originalPrice / 2);
    }
  };

  const isHalfPriceApplied = item.priceAtSale === item.originalPrice / 2;

  return (
    <div className="p-3 bg-white border border-slate-100 rounded-2xl transition-all hover:border-blue-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h5 className="font-bold text-slate-800 text-[11px] uppercase truncate">{item.name}</h5>
            {isOldBatch && (
              <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[7px] font-black uppercase tracking-wider">
                OLD
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[8px] font-bold text-slate-400">#{item.productCode}</span>
            <span className="text-[8px] font-bold text-slate-300 uppercase">B: {item.dailyStockId?.toString().slice(-4) || 'N/A'}</span>
          </div>
        </div>
        <button 
          onClick={() => onRemove(item.productId, item.dailyStockId)} 
          className="p-1 text-slate-300 hover:text-red-500 transition-all rounded"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100">
          <button 
            onClick={() => onUpdate(item.productId, item.dailyStockId, 'quantity', item.quantity - 1)} 
            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-600 rounded active:scale-90"
          >
            <Minus size={12} strokeWidth={3} />
          </button>
          <span className="w-8 text-center text-[11px] font-black text-slate-800 tabular-nums">{item.quantity}</span>
          <button 
            onClick={() => onUpdate(item.productId, item.dailyStockId, 'quantity', item.quantity + 1)} 
            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-600 rounded active:scale-90"
          >
            <Plus size={12} strokeWidth={3} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleHalfPrice}
            className={`px-2 py-1 rounded text-[8px] font-black transition-all border ${
              isHalfPriceApplied 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'
            }`}
          >
            1/2
          </button>
          <div className="text-right">
            <p className="text-xs font-black text-slate-900 leading-none">₹{(item.priceAtSale * item.quantity).toLocaleString()}</p>
            <p className="text-[8px] text-slate-400 mt-0.5">@ ₹{item.priceAtSale}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CartItem;
