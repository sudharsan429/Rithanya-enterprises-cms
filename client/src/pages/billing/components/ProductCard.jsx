import React from 'react';
import { Plus, Package, Calendar } from 'lucide-react';

const ProductCard = React.memo(({ product, stockItem, onAdd }) => {
  const available = stockItem?.quantity || 0;
  const price = (stockItem && stockItem.price > 0) ? stockItem.price : (product.price || 0);
  const isOldBatch = React.useMemo(() => {
    if (!stockItem?.dailyStockId?.date) return false;
    const batchDate = new Date(stockItem.dailyStockId.date).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    return batchDate < today;
  }, [stockItem?.dailyStockId?.date]);

  return (
    <div
      onClick={() => available > 0 && onAdd(stockItem)}
      className={`group relative bg-white p-5 rounded-[2.5rem] border-2 transition-all cursor-pointer flex flex-col min-h-[220px] active:scale-[0.98] ${available <= 0
          ? 'opacity-40 grayscale border-slate-100 bg-slate-50'
          : 'border-slate-50 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-100/50'
        }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1">
          {isOldBatch && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full text-[8px] font-black uppercase tracking-wider mb-1 border border-orange-100">
               <Calendar size={10} /> OLD
            </span>
          )}
        </div>
        <div className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${available > 10
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
            : available > 0
              ? 'bg-orange-50 text-orange-600 border-orange-100'
              : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}>
          {available > 0 ? `${available} ${product?.uom || 'pc'}` : 'OUT OF STOCK'}
        </div>
      </div>

      <h4 className="font-black text-slate-900 text-base leading-tight uppercase tracking-tight flex-1 group-hover:text-blue-700 transition-colors">
        {product.name} - {product.productCode}
      </h4>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Unit Price</span>
          <span className="text-slate-950 font-black text-2xl tabular-nums tracking-tighter">
            ₹{price.toLocaleString()}
          </span>
        </div>

        <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 ${available > 0
            ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 group-hover:rotate-90'
            : 'bg-slate-200 text-slate-400'
          }`}>
          {available > 0 ? <Plus className="w-6 h-6" strokeWidth={3} /> : <Package size={20} />}
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
