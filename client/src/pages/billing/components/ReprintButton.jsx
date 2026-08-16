import React from 'react';
import { Printer } from 'lucide-react';

const ReprintButton = ({ lastSale, onPrint, disabled }) => {
  if (!lastSale) return null;

  return (
    <button
      onClick={() => onPrint(lastSale)}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-bold text-[10px] uppercase tracking-widest disabled:opacity-50"
    >
      <Printer size={14} />
      <span>Reprint Last Bill</span>
    </button>
  );
};

export default ReprintButton;
