import React, { useState, useEffect, useCallback } from 'react';
import ManagementTable from '../../components/ManagementTable';
import api from '../../api/axios';
import { 
  ArrowRightLeft, 
  Factory, 
  Store,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import { Search, Eye, X, Calendar, MapPin, ClipboardCheck, TrendingUp, AlertTriangle, Loader2, Clock, CheckCircle2 } from 'lucide-react';

const TransfersListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(user?.role === 'salesperson' ? 'Canteen-to-Canteen' : 'PU-to-PU');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        type: activeTab,
        search: searchTerm
      });
      const res = await api.get(`/transfers?${params.toString()}`);
      setTransfers(res.data.data || []);
      setTotalPages(res.data.pages || 1);
    } catch {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pending transfer?')) return;
    try {
      await api.delete(`/transfers/${id}`);
      toast.success('Transfer deleted');
      fetchData();
    } catch (_err) {
      toast.error(_err.response?.data?.message || 'Delete failed');
    }
  };

  const tabs = [
    { id: 'PU-to-PU', label: 'Unit to Unit', icon: Factory, roles: ['superadmin', 'admin', 'prod_manager'] },
    { id: 'PU-to-Canteen', label: 'Unit to Canteen', icon: Store, roles: ['superadmin', 'admin', 'prod_manager'] },
    { id: 'Canteen-to-Canteen', label: 'Canteen to Canteen', icon: ArrowRightLeft, roles: ['superadmin', 'admin', 'salesperson'] }
  ].filter(tab => tab.roles.includes(user?.role));

  // Filtered transfers (already filtered by type and search from backend, but added status/type check just in case)
  const filteredTransfers = transfers;


  const openDetailModal = async (id) => {
    setModalLoading(true);
    setShowDetailModal(true);
    try {
      const res = await api.get(`/transfers/${id}`);
      setSelectedTransfer(res.data);
    } catch {
      toast.error('Failed to load details');
      setShowDetailModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    { 
      header: 'Locations', 
      render: (t) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            FROM: {t.fromLocation?.id?.name || 'System / Default'}
          </span>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
            TO: {t.toLocation?.id?.name || 'Warehouse / Unknown'}
          </span>
        </div>
      )
    },
    { 
      header: 'Status', 
      render: (t) => (
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
          t.overallStatus === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          t.overallStatus === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
          'bg-slate-50 text-slate-500 border-slate-100'
        }`}>
          {t.overallStatus || 'unknown'}
        </span>
      )
    },
    { header: 'Items', render: (t) => <span className="font-bold text-slate-700">{(t.products || []).length} Items</span> },
    { header: 'Date', render: (t) => <span className="text-slate-500 font-medium">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'}</span> }
  ];

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden p-2 md:p-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
          <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-100 shadow-sm backdrop-blur-sm overflow-x-auto no-scrollbar w-full sm:w-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                    isActive 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-blue-500' : 'text-slate-300'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 w-full lg:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 md:w-4 md:h-4" />
            <input 
              type="text" 
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 md:py-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all w-full shadow-sm"
            />
          </div>
        </div>
      </div>

      <ManagementTable 
        title={`${activeTab.replace(/-/g, ' ')} History`}
        data={filteredTransfers} 
        columns={columns} 
        loading={loading}
        onAdd={() => navigate(`/transfers/new?type=${activeTab}`)}
        addName={'Add Transfer'}
        onSearch={null} 
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        renderActions={(item) => (
          <div className="flex gap-2">
            {item.overallStatus === 'completed' && (
              <button 
                onClick={() => openDetailModal(item._id)}
                className="p-2.5 text-blue-500 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-all shadow-sm"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {item.overallStatus === 'pending' && (
              <>
                <button 
                  onClick={() => navigate(`/transfers/edit/${item._id}`)}
                  className="p-2.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Edit Transfer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(item._id)}
                  className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  title="Delete Transfer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      />

      {/* History Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-linear-to-br from-blue-600 via-indigo-700 to-slate-900 opacity-95" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="px-6 md:px-10 py-6 md:py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  <ClipboardCheck className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                   <h2 className="text-sm md:text-xl font-bold text-slate-800 tracking-tight">Audit Inspection Report</h2>
                   <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: #{selectedTransfer?._id.slice(-8).toUpperCase()}</span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-bold uppercase">Archive</div>
                   </div>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                   <Loader2 className="w-8 h-8 animate-spin text-blue-200" />
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extracting audit trail...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm border border-slate-100">
                           <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase">Archive Date</p>
                           <p className="text-[11px] font-bold text-slate-700">{selectedTransfer && new Date(selectedTransfer.updatedAt).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm border border-slate-100">
                           <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase">Received From</p>
                           <p className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{selectedTransfer?.fromLocation?.id?.name}</p>
                        </div>
                     </div>
                     <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 items-center gap-4 hidden lg:flex">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm border border-slate-100">
                           <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase">Total SKU</p>
                           <p className="text-[11px] font-bold text-slate-700">{selectedTransfer?.products.length} Products</p>
                        </div>
                     </div>
                  </div>

                  <div className="border border-slate-100 rounded-4xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Product Specs</th>
                            <th className="px-4 py-4 text-center">Sent</th>
                            <th className="px-4 py-4 text-center">Verified</th>
                            <th className="px-6 py-4 text-right">Ledger Delta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {selectedTransfer?.products.map((p, idx) => {
                            const delta = p.quantity - p.acceptedQuantity;
                            return (
                              <tr key={idx} className="hover:bg-blue-50/20 transition-all">
                                <td className="px-6 py-5">
                                   <p className="text-xs font-bold text-slate-700">{p.productId.name}</p>
                                   <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Code: {p.productId.productCode || 'N/A'}</p>
                                </td>
                                <td className="px-4 py-5 text-center font-bold text-slate-400 text-xs">{p.quantity}</td>
                                <td className="px-4 py-5 text-center font-bold text-emerald-600 text-xs">{p.acceptedQuantity}</td>
                                <td className="px-6 py-5 text-right whitespace-nowrap">
                                   {delta > 0 ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-bold uppercase">
                                         <AlertTriangle className="w-2.5 h-2.5" /> -{delta} Units
                                      </span>
                                   ) : (
                                      <span className="text-[9px] font-bold text-slate-300 uppercase">Matched</span>
                                   )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-10 py-6 border-t border-slate-100 bg-slate-50/30 flex justify-end shrink-0">
               <button onClick={() => setShowDetailModal(false)} className="bg-slate-800 text-white px-10 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-200">Close Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransfersListPage;
