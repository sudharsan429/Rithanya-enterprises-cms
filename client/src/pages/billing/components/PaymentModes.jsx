import React from 'react';
import { Banknote, CreditCard, ArrowLeftRight, Gift, Percent } from 'lucide-react';

const ModeBtn = React.memo(({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border transition-all duration-300 group active:scale-95
      ${active ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-50' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200 hover:bg-blue-50/10'}
    `}
  >
    <Icon className={`w-3.5 h-3.5 mb-1 ${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-500 transition-colors'}`} />
    <span className={`text-[7px] font-black tracking-widest uppercase ${active ? 'text-white' : 'text-slate-500'}`}>{label}</span>
  </button>
));

const PaymentModes = ({ paymentMode, setPaymentMode, totalAmount, setSplitCash }) => {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      <ModeBtn 
        active={paymentMode === 'cash'} 
        icon={Banknote} 
        label="CASH" 
        onClick={() => setPaymentMode('cash')} 
      />
      <ModeBtn 
        active={paymentMode === 'upi'} 
        icon={CreditCard} 
        label="UPI" 
        onClick={() => setPaymentMode('upi')} 
      />
      <ModeBtn 
        active={paymentMode === 'split'} 
        icon={ArrowLeftRight} 
        label="SPLIT" 
        onClick={() => { setPaymentMode('split'); setSplitCash(totalAmount); }} 
      />
      <ModeBtn 
        active={paymentMode === 'complimentary'} 
        icon={Gift} 
        label="COMP." 
        onClick={() => setPaymentMode('complimentary')} 
      />
      <ModeBtn 
        active={paymentMode === 'discount'} 
        icon={Percent} 
        label="DISC." 
        onClick={() => setPaymentMode('discount')} 
      />
    </div>
  );
};

export default PaymentModes;
