import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

const SearchableSelect = ({ options, value, onChange, placeholder = "Select option...", label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">{label}</label>}
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm cursor-pointer flex items-center justify-between transition-all ${isOpen ? 'border-slate-900 ring-4 ring-slate-900/5' : 'border-slate-100 hover:border-slate-300'}`}
        >
          <span className={selectedOption ? "text-slate-900 font-medium" : "text-slate-400 italic"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2 border-b border-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Type to search..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl text-xs focus:outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <p className="p-3 text-xs text-slate-400 italic text-center">No options found</p>
              ) : (
                filteredOptions.map((opt) => (
                  <div 
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${value === opt.value ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    <span className="text-xs font-bold">{opt.label}</span>
                    {value === opt.value && <Check className="w-3.5 h-3.5" />}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableSelect;
