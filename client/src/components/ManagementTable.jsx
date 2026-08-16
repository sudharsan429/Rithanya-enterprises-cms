import React from 'react';
import { Edit2, Trash2, Plus, Search } from 'lucide-react';
import Pagination from './Pagination';

const ManagementTable = ({ 
  title, 
  data, 
  columns, 
  onAdd, 
  onEdit, 
  onDelete, 
  loading,
  searchPlaceholder = "Search...",
  onSearch,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  renderActions,
  addName,
  hideActions = false
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
          <p className="text-slate-400 text-sm font-medium mt-1">Manage and monitor your system {title.toLowerCase()}.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder={searchPlaceholder}
              onChange={(e) => onSearch?.(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-64"
            />
          </div>
          <button 
            onClick={onAdd}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm shadow-blue-200 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> {addName || "Add New"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100">
              {columns.map((col, i) => (
                <th key={i} className="px-8 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  {col.header}
                </th>
              ))}
              {!hideActions && (
                <th className="px-8 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50/50">
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-8 py-10 text-center text-slate-400 italic">
                  Loading data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-8 py-10 text-center text-slate-400 italic">
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={item._id || i} className={`transition-colors group ${item.isSubtotal ? 'bg-slate-50/80' : 'hover:bg-slate-50/30'}`}>
                  {columns.map((col, j) => (
                    <td key={j} className={`px-8 py-5 text-sm font-medium ${item.isSubtotal ? 'text-slate-800 font-bold' : 'text-slate-600'}`}>
                      <div className="truncate max-w-[150px] lg:max-w-[250px]">
                        {col.render ? col.render(item) : item[col.key]}
                      </div>
                    </td>
                  ))}
                  {!hideActions && (
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 outline-none">
                        {renderActions && renderActions(item)}
                        {onEdit && (
                          <button 
                            onClick={() => onEdit(item)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button 
                            onClick={() => onDelete(item._id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
};

export default ManagementTable;
