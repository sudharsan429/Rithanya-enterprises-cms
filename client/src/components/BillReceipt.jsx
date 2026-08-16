import React from 'react';

const BillReceipt = React.forwardRef(({ sale }, ref) => {
  if (!sale) return null;

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  };

  return (
    <div ref={ref} className="bg-white p-2 max-w-[300px] mx-auto text-black font-mono text-[11px] leading-tight printable-receipt print:visible print:p-0">
      {/* Header */}
      <div className="text-center space-y-1 mb-2">
        <h2 className="text-sm font-bold uppercase tracking-tighter">Rithanya Enterprises</h2>
        <p className="font-bold uppercase text-[10px]">{sale.canteenId?.name || 'RITHANYA ENTERPRISES'}</p>
        <p className="text-[9px] tracking-tight">{sale.canteenId?.location || 'Sulur, Coimbatore'}</p>
        
        <div className="border-t border-dotted border-black my-1.5" />
        
        <div className="text-left text-[9px] space-y-0.5 px-0.5">
          <div className="flex justify-between">
            <span className="font-bold">BILL NO: {sale.billNo}</span>
            <span>{formatDate(sale.createdAt)}</span>
          </div>
        </div>
        
        <div className="border-t border-dotted border-black my-1.5" />
      </div>

      {/* Items Table */}
      <div className="space-y-1 mb-2">
        <div className="flex justify-between font-bold text-[9px] border-b border-black pb-0.5 mb-1">
          <span className="w-[140px]">Item</span>
          <span className="w-[30px] text-center">Qty</span>
          <span className="w-[50px] text-right">Rate</span>
          <span className="w-[60px] text-right">Amt</span>
        </div>
        
        {sale.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-start text-[9px] py-0.5">
            <span className="w-[130px] wrap-break-word uppercase leading-[1.1]">{item.productId?.name}</span>
            <span className="w-[30px] text-center">{item.quantity.toFixed(0)}</span>
            <span className="w-[50px] text-right">{item.priceAtSale.toFixed(0)}</span>
            <span className="w-[60px] text-right font-bold">{item.subtotal.toFixed(0)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dotted border-black my-1.5" />

      {/* Summary */}
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between font-bold text-[11px]">
          <span className="uppercase">Net Total</span>
          <span>₹{sale.totalAmount.toFixed(1)}</span>
        </div>
        
        {sale.paymentDetails?.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>- {sale.paymentDetails.discountAmount.toFixed(1)}</span>
          </div>
        )}

        <div className="flex justify-between pt-1">
          <span className="uppercase">Paid ({sale.paymentMode}):</span>
          <span>{ (sale.paymentDetails?.cashReceived || sale.totalAmount).toFixed(1) }</span>
        </div>
        
        {sale.paymentDetails?.changeAmount > 0 && (
          <div className="flex justify-between">
            <span>Balance:</span>
            <span>{ sale.paymentDetails.changeAmount.toFixed(1) }</span>
          </div>
        )}
      </div>

      {/* Footer / Branding */}
      <div className="text-center mt-3 pt-2 border-t border-dotted border-black">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 underline">Bill Receipt</p>
        <p className="text-[9px] uppercase font-bold tracking-tighter">*** Thank You! Visit Again ***</p>
        <div className="text-left mt-2 space-y-0.5 border-t border-dotted border-black pt-1 px-1">
          <p className="text-[7px] font-bold uppercase tracking-tight">Terms & Conditions:</p>
          <p className="text-[7px] italic">- Items sold for immediate consumption.</p>
          <p className="text-[7px] italic">- No refund or exchange once sold.</p>
        </div>
        <p className="text-[8px] italic mt-2 opacity-75 underline">Served by {sale.soldBy?.name || 'TERMINAL'}</p>
      </div>
    </div>
  );
});

export default BillReceipt;
