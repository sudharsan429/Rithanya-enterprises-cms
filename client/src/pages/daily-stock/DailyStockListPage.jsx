import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { 
  Loader2, 
  ClipboardList, 
  IndianRupee, 
  Package, 
  Calendar, 
  ArrowRight, 
  Edit3, 
  Trash2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';

const DailyStockListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('today');
  const [dailyEntries, setDailyEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedEntryProducts, setSelectedEntryProducts] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dailyRes = await api.get('/stock/daily?all=true');
      setDailyEntries(dailyRes.data || []);
    } catch {
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (entry) => {
    if (entry.isLocked) {
      return toast.error('Cannot edit: Stock already transferred');
    }
    navigate(`/daily-stock/edit/${entry._id}`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/stock/daily/${deleteId}`);
      toast.success('Stock entry deleted successfully');
      setDeleteId(null);
      fetchData();
    } catch (_error) {
      toast.error(_error.response?.data?.message || 'Failed to delete entry');
    }
  };

  const handleOpenDetails = async (entry) => {
    setSelectedEntry(entry);
    setSelectedEntryProducts(entry.products || []);
    setDetailsLoading(true);

    try {
      const locationId = entry.productionUnitId?._id || entry.productionUnitId;
      const res = await api.get(`/stock/levels?locationId=${locationId}&locationType=ProductionUnit&aggregate=true`);

      const normalizedProducts = (res.data || []).map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity) || 0,
        transferQty: Number(item.transferQty) || 0,
        soldQty: Number(item.soldQty) || 0,
        damagedQty: Number(item.damagedQty || item.damagedQuantity) || 0,
        costPrice: Number(item.costPrice || item.productId?.price) || 0,
        price: Number(item.price) || 0,
      }));

      setSelectedEntryProducts(normalizedProducts);
    } catch {
      setSelectedEntryProducts(entry.products || []);
      toast.error('Failed to load full product list');
    } finally {
      setDetailsLoading(false);
    }
  };

  const sortedEntries = [...dailyEntries].sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date);
    if (dateDiff !== 0) return dateDiff;

    return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
  });

  const todayEntries = sortedEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    const now = new Date();
    if (now.getHours() < 3) now.setDate(now.getDate() - 1);
    return entryDate.setHours(0,0,0,0) === now.setHours(0,0,0,0);
  });

  const todayEntryIds = new Set(todayEntries.map(entry => entry._id));
  const historyEntries = sortedEntries.filter(entry => !todayEntryIds.has(entry._id));

  const displayedEntries = activeTab === 'today' ? todayEntries : historyEntries;
  
  // Apply pagination to history entries only (Today is usually small)
  const isHistory = activeTab === 'history';
  const totalPages = Math.ceil(displayedEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEntries = isHistory 
    ? displayedEntries.slice(startIndex, startIndex + itemsPerPage)
    : displayedEntries;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Daily Stock Logs</h1>
           <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Inventory Tracking & Auditing</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-100 shadow-sm backdrop-blur-sm">
            <button
              onClick={() => { setActiveTab('today'); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                activeTab === 'today' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
              }`}
            >
              <Calendar className={`w-4 h-4 ${activeTab === 'today' ? 'text-blue-500' : 'text-slate-300'}`} />
              Today
            </button>
            <button
              onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                activeTab === 'history' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
              }`}
            >
              <History className={`w-4 h-4 ${activeTab === 'history' ? 'text-blue-500' : 'text-slate-300'}`} />
              History
            </button>
          </div>
          <button 
            onClick={() => navigate('/daily-stock/new')}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-800 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> New Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full h-64 flex items-center justify-center">
             <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : currentEntries.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
             <Package className="w-12 h-12 mx-auto text-slate-200" />
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No entries recorded</p>
          </div>
        ) : activeTab === 'today' ? (
          currentEntries.map(entry => (
            <div 
              key={entry._id} 
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col"
            >
               {/* Card Header Section */}
               <div className="p-6 border-b border-slate-100 bg-slate-50/30 relative">
                  <div className="absolute top-5 right-5 flex gap-2 transition-all transform translate-y-1 group-hover:translate-y-0 z-10">
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                       className={`p-2 rounded-xl bg-white text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-md border border-slate-100 ${entry.isLocked ? 'opacity-30 cursor-not-allowed' : ''}`}
                       title={entry.isLocked ? "Stock already transferred" : "Edit Entry"}
                     >
                       <Edit3 className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); setDeleteId(entry._id); }}
                       className={`p-2 rounded-xl bg-white text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-md border border-slate-100 ${entry.isLocked ? 'opacity-30 cursor-not-allowed' : ''}`}
                       title={entry.isLocked ? "Stock already transferred" : "Delete Entry"}
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>

                  <div className="space-y-4">
                     <div>
                        <div className="flex items-center gap-2 mb-1.5">
                           <Calendar className="w-3.5 h-3.5 text-slate-400" />
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                              {new Date(entry.date).toLocaleDateString()}
                           </span>
                        </div>
                        <div className="mb-2 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-600">
                           Current Entry
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight pr-16">{entry.productionUnitId?.name || 'Unknown Unit'}</h2>
                     </div>

                     <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                        <div className="flex items-center gap-6">
                           <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-slate-400" />
                              <div>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Stock</p>
                                 <p className="text-xs font-bold text-slate-700">{entry.totalStock?.toLocaleString()} Items</p>
                              </div>
                           </div>
                           <div className="w-px h-6 bg-slate-200"></div>
                           <div className="flex items-center gap-2">
                              <ClipboardList className="w-4 h-4 text-slate-400" />
                              <div>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Products</p>
                                 <p className="text-xs font-bold text-slate-700">{(entry.products || []).length} Items</p>
                              </div>
                           </div>
                        </div>

                        <div className="text-right">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected Revenue</p>
                           <p className="text-lg font-black text-blue-600 flex items-center justify-end gap-0.5 leading-none">
                              <IndianRupee className="w-4 h-4" />{entry.totalRevenue?.toLocaleString()}
                           </p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Product List Section */}
               <div className="flex-1 p-4 bg-white">
                  <div className="rounded-xl border border-slate-50 overflow-hidden">
                     <table className="w-full text-[10px] text-left">
                        <thead className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-50">
                           <tr>
                              <th className="px-3 py-2.5">Name</th>
                              <th className="px-2 py-2.5 text-right">Prod</th>
                              <th className="px-2 py-2.5 text-right">Trans</th>
                              <th className="px-3 py-2.5 text-center">Status</th>
                              <th className="px-3 py-2.5 text-right">Price</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {entry.products.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                 <td className="px-3 py-2.5 font-bold text-slate-700 truncate max-w-[80px]">{item.productId?.name || 'Deleted Product'}</td>
                                 <td className="px-2 py-2.5 text-right font-black text-slate-400">{item.quantity || 0}</td>
                                 <td className="px-2 py-2.5 text-right font-black text-blue-600">{item.transferQty || 0}</td>
                                 <td className="px-3 py-2.5 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest border ${
                                      (item.transferQty > 0 || item.status === 'transfer') ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    }`}>
                                       {(item.transferQty > 0 || item.status === 'transfer') ? 'TRANSFER' : 'ONSTOCK'}
                                    </span>
                                 </td>
                                 <td className="px-3 py-2.5 text-right font-bold text-slate-500">₹{item.costPrice}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>

               <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4">
                  <button
                    onClick={() => handleOpenDetails(entry)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-blue-600 shadow-sm transition-all hover:bg-blue-600 hover:text-white active:scale-95"
                    title="View Details"
                  >
                    Full Detailed View
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
               </div>

            </div>
          ))
        ) : (
          <div className="col-span-full overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-right">Added Stock</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-right">Target Value</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-right text-blue-600 bg-blue-50/30">Actual Sale</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-right text-green-600 bg-green-50/30">Revenue</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentEntries.map(entry => (
                  <tr key={entry._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-600">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">
                      {(entry.products || []).length} SKUs / {entry.totalStock} Qty
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-400">
                      ₹{entry.totalRevenue?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600 bg-blue-50/10">
                      {entry.actualSaleQty?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-green-600 bg-green-50/10">
                      ₹{entry.actualRevenue?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button 
                          onClick={() => handleOpenDetails(entry)}
                          className="flex items-center gap-2 px-5 py-2 rounded-xl border border-blue-100 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm active:scale-95"
                          title="View Details"
                        >
                          <ArrowRight className="w-3.5 h-3.5" /> Full Audit View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination UI */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, displayedEntries.length)} of {displayedEntries.length} entries
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirm Deletion"
        maxWidth="max-w-md"
      >
        <div className="p-6 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-800">Are you sure?</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              This action will permanently delete this stock record and reverse the inventory additions. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setDeleteId(null)}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all uppercase tracking-widest"
            >
              No, Keep it
            </button>
            <button 
              onClick={handleDelete}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl text-xs font-bold shadow-xl shadow-red-500/20 hover:bg-red-700 active:scale-95 transition-all uppercase tracking-widest"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Product Details Modal */}
      <Modal
        isOpen={!!selectedEntry}
        onClose={() => { setSelectedEntry(null); setSelectedEntryProducts([]); }}
        title="Stock Entry Details"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Date</p>
                <p className="text-sm font-bold text-slate-800">{selectedEntry && new Date(selectedEntry.date).toLocaleDateString()}</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Value</p>
                <p className="text-sm font-bold text-blue-600 flex items-center justify-end gap-1">
                   <IndianRupee className="w-3.5 h-3.5" />{selectedEntryProducts.reduce((sum, item) => {
                     return sum + ((Number(item.quantity) || 0) * (Number(item.costPrice) || 0));
                   }, 0).toLocaleString()}
                </p>
             </div>
          </div>

          <div className="space-y-3">
             <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest px-1">Product List</h4>
             <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-[10px]">
                   <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                         <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Product</th>
                         <th className="px-2 py-3 font-bold text-slate-500 uppercase tracking-wider text-right">Prod</th>
                         <th className="px-2 py-3 font-bold text-blue-500 uppercase tracking-wider text-right">Trans</th>
                         <th className="px-2 py-3 font-bold text-orange-500 uppercase tracking-wider text-right">Sold</th>
                         <th className="px-2 py-3 font-bold text-red-500 uppercase tracking-wider text-right">Dmg</th>
                         <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-right">Total Val</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {detailsLoading ? (
                         <tr>
                            <td colSpan="6" className="px-4 py-8 text-center">
                               <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-300" />
                            </td>
                         </tr>
                      ) : selectedEntryProducts.map((item, idx) => (
                         <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                               <p className="font-bold text-slate-800">{item.productId?.name || 'Unknown Product'}</p>
                               <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tight">{item.productId?.productCode}</p>
                            </td>
                            <td className="px-2 py-3 text-right font-bold text-slate-400">
                               {item.quantity}
                            </td>
                            <td className="px-2 py-3 text-right font-black text-blue-600">
                               {item.transferQty || 0}
                            </td>
                            <td className="px-2 py-3 text-right font-black text-orange-600">
                               {item.soldQty || 0}
                            </td>
                            <td className="px-2 py-3 text-right font-black text-red-600">
                               {item.damagedQty || item.damagedQuantity || 0}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800">
                               ₹{(item.quantity * item.costPrice).toLocaleString()}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          <div className="flex justify-end pt-2">
             <button 
                onClick={() => { setSelectedEntry(null); setSelectedEntryProducts([]); }}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
             >
                Close Details
             </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DailyStockListPage;
