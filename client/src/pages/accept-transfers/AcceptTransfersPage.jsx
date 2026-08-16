import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import {
  Factory,
  Store,
  ArrowRightLeft,
  PackageCheck,
  Loader2,
  Search,
  X,
  Calendar,
  MapPin,
  ClipboardCheck,
  History as HistoryIcon,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';

const AcceptTransfersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PU-to-PU');
  const [statusTab, setStatusTab] = useState('queue'); // 'queue' or 'history'

  // History Modal State
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        status: statusTab === 'queue' ? 'pending' : 'completed',
        type: activeTab,
        search: searchTerm
      });

      const res = await api.get(`/transfers?${params.toString()}`);

      const allTransfers = res.data.data || [];
      const isAdmin = user.role === 'admin' || user.role === 'superadmin';

      const filtered = isAdmin ? allTransfers : allTransfers.filter(t => {
        const assignedId = t.transferType.endsWith('Canteen') ? user.assignedCanteen : user.assignedProductionUnit;
        return t.toLocation?.id?._id === assignedId;
      });

      setTransfers(filtered);
      setTotalPages(res.data.pages || 1);
      setTotalItems(res.data.total || 0);
    } catch (_error) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, statusTab, page, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, statusTab]);

  const openHistoryModal = async (id) => {
    setModalLoading(true);
    setShowHistoryModal(true);
    try {
      const res = await api.get(`/transfers/${id}`);
      setSelectedTransfer(res.data);
    } catch (_error) {
      toast.error('Failed to load transfer details');
      setShowHistoryModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleAction = (item) => {
    if (statusTab === 'history') {
      openHistoryModal(item._id);
    } else {
      navigate(`/accept-transfers/${item._id}`);
    }
  };

  const tabs = [
    { id: 'PU-to-PU', label: 'Unit to Unit', icon: Factory, roles: ['superadmin', 'admin', 'prod_manager'] },
    { id: 'PU-to-Canteen', label: 'Unit to Canteen', icon: Store, roles: ['superadmin', 'admin','salesperson'] },
    { id: 'Canteen-to-Canteen', label: 'Canteen to Canteen', icon: ArrowRightLeft, roles: ['superadmin', 'admin', 'salesperson'] }
  ].filter(tab => tab.roles.includes(user?.role));

  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden p-2 md:p-0 pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <PackageCheck className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-tight">Intake Dashboard</h1>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">Manage & Verify Transfers</p>
          </div>
        </div>


      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
        {/* Status Toggle & Info Badge */}
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex bg-slate-100 p-1 rounded-2xl shadow-sm overflow-hidden w-fit">
            <button
              onClick={() => setStatusTab('queue')}
              className={`px-6 md:px-8 py-2 md:py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${statusTab === 'queue' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <Loader2 className={`w-3.5 h-3.5 ${statusTab === 'queue' && loading ? 'animate-spin' : ''}`} />
              Queue
            </button>
            <button
              onClick={() => setStatusTab('history')}
              className={`px-6 md:px-8 py-2 md:py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${statusTab === 'history' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <HistoryIcon className="w-3.5 h-3.5" />
              History
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-blue-50/50 px-5 py-2.5 rounded-2xl border border-blue-100/50">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <p className="text-[10px] text-blue-700 font-bold uppercase tracking-widest">{totalItems} Total Transfers</p>
          </div>
        </div>
      </div>

      {/* Global Controls: Search + Tabs */}
      <div className="bg-white p-4 md:p-5 rounded-4xl border border-slate-200 shadow-sm shadow-slate-100/50 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          {/* Location Tabs */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-5 md:px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-blue-500' : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
            <input
              type="text"
              placeholder="Filter by Order ID, Location or Product..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-3.5 text-xs font-bold text-slate-700 transition-all outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>


        </div>
      </div>



      {/* Main Table Content */}
      <div className="bg-white border border-slate-200 rounded-4xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-5 md:px-8 py-4 md:py-5">Transfer ID</th>
                <th className="px-4 md:px-6 py-4 md:py-5">Location Log</th>
                <th className="px-4 md:px-6 py-4 md:py-5">Items</th>
                <th className="px-4 md:px-6 py-4 md:py-5">{statusTab === 'history' ? 'Completed' : 'Initiated'}</th>
                <th className="px-5 md:px-8 py-4 md:py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-200 mx-auto mb-3" />
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Updating data...</p>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <PackageCheck className="w-12 h-12 text-slate-200 mx-auto mb-4 opacity-40" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No matching transfers found</p>
                  </td>
                </tr>
              ) : (
                transfers.map((item) => (
                  <tr key={item._id} className="hover:bg-blue-50/10 transition-all">
                    <td className="px-5 md:px-8 py-5 md:py-6">
                      <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        # {item._id.slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-5 md:py-6 whitespace-nowrap">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-slate-300 rounded-full" />
                          <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[120px]">
                            {item.fromLocation?.id?.name || 'System'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-blue-500 rounded-full" />
                          <span className="text-[9px] md:text-[10px] font-bold text-blue-600 uppercase tracking-widest truncate max-w-[120px]">
                            {item.toLocation?.id?.name || 'Canteen'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-5 md:py-6">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-700">{item.products?.length || 0} SKU</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-5 md:py-6">
                      <p className="text-[10px] font-bold text-slate-700">{new Date(statusTab === 'history' ? item.updatedAt : item.createdAt).toLocaleDateString()}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">{new Date(statusTab === 'history' ? item.updatedAt : item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-5 md:px-8 py-5 md:py-6 text-right">
                      <button
                        onClick={() => handleAction(item)}
                        className={`px-5 md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${statusTab === 'history'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                          : 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700'
                          }`}
                      >
                        {statusTab === 'history' ? 'Verify Report' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
        />
      </div>



      {/* Detail Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)} />
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-4xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="px-6 md:px-10 py-6 md:py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  <ClipboardCheck className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h2 className="text-sm md:text-xl font-bold text-slate-800 tracking-tight">Inspection Report</h2>
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Record #: {selectedTransfer?._id.slice(-8).toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-200" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generating detailed audit...</p>
                </div>
              ) : (
                <div className="space-y-6 md:space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-slate-50/50 p-4 md:p-5 rounded-3xl border border-slate-100 flex items-center gap-4">
                      <div className="px-3 py-3 bg-white rounded-2xl text-blue-500 shadow-sm border border-slate-100"><Calendar className="w-4 h-4" /></div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Received Date</p>
                        <p className="text-[11px] font-bold text-slate-700">{selectedTransfer && new Date(selectedTransfer.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 p-4 md:p-5 rounded-3xl border border-slate-100 flex items-center gap-4">
                      <div className="px-3 py-3 bg-white rounded-2xl text-blue-500 shadow-sm border border-slate-100"><MapPin className="w-4 h-4" /></div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">From</p>
                        <p className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{selectedTransfer?.fromLocation?.id?.name}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 p-4 md:p-5 rounded-3xl border border-slate-100 hidden lg:flex items-center gap-4">
                      <div className="px-3 py-3 bg-white rounded-2xl text-blue-500 shadow-sm border border-slate-100"><TrendingUp className="w-4 h-4" /></div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Audit Count</p>
                        <p className="text-[11px] font-bold text-slate-700">{selectedTransfer?.products.length} SKU(s)</p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-4">Specs</th>
                            <th className="px-4 py-4 text-center">Invoiced</th>
                            <th className="px-4 py-4 text-center">Verified</th>
                            <th className="px-6 py-4 text-right">Discrepancy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {selectedTransfer?.products.map((p, idx) => {
                            const disc = p.originalQuantity - p.acceptedQuantity;
                            return (
                              <tr key={idx} className="hover:bg-blue-50/10">
                                <td className="px-6 py-5">
                                  <p className="text-xs font-bold text-slate-700">{p.productId.name}</p>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Code: {p.productId.productCode || 'N/A'}</p>
                                </td>
                                <td className="px-4 py-5 text-center font-bold text-slate-500 text-xs">{p.originalQuantity}</td>
                                <td className="px-4 py-5 text-center font-bold text-emerald-600 text-xs">{p.acceptedQuantity}</td>
                                <td className="px-6 py-5 text-right">
                                  {disc > 0 ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-bold">
                                      <AlertTriangle className="w-2.5 h-2.5" /> -{disc} UNITS
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-slate-200">MATCH</span>
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
              <button onClick={() => setShowHistoryModal(false)} className="bg-slate-800 text-white px-10 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcceptTransfersPage;
