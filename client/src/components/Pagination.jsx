import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = React.useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center justify-center gap-2 py-6 border-t border-slate-50/50 bg-slate-50/10">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || totalPages <= 1}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2">
        {getPageNumbers.map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-2 text-slate-300 font-black tracking-widest">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page)}
                disabled={currentPage === page}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${
                  currentPage === page
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105 z-10'
                    : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-blue-100'
                }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || totalPages <= 1}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Pagination;
