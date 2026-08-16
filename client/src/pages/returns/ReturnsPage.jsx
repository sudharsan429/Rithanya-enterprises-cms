import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  Loader2,
  RotateCcw,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  ClipboardList,
  Wrench,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';

const ReturnsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('damage');
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [repairing, setRepairing] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal for details
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10
      };
      if (activeTab === 'approval') {
        params.status = 'pending';
        // Admins see all pending returns, Managers only see their own unit's returns
        if (user?.role !== 'admin' && user?.role !== 'superadmin') {
          params.targetLocationId = user.assignedProductionUnit;
        }
      } else {
        params.type = activeTab;
        // Admins see everything, Others see their assigned location
        if (user?.role === 'prod_manager') {
          params.locationId = user.assignedProductionUnit;
          params.targetLocationId = user.assignedProductionUnit;
        } else if (user?.role === 'salesperson') {
          params.locationId = user.assignedCanteen;
        }
      }

      const res = await api.get('/returns', { params });
      setReturns(res.data.data || []);
      setTotalPages(res.data.pages || 1);
    } catch {
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusUpdate = async (id, status) => {
    setProcessingId(id);
    try {
      await api.put(`/returns/${id}/status`, { status });
      toast.success(`Return ${status === 'approved' ? 'Accepted' : 'Rejected'}`);
      fetchData();
    } catch {
      toast.error('Update failed');
    } finally {
      setProcessingId(null);
    }
  };
  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this return? Stock will be restored to your inventory.')) return;
    setProcessingId(id);
    try {
      await api.put(`/returns/${id}/cancel`);
      toast.success('Return cancelled and stock restored');
      fetchData();
    } catch {
      toast.error('Cancellation failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRepairStock = async () => {
    setRepairing(true);
    try {
      await api.post('/stock/migrate');
      toast.success('Stock origin data repaired successfully');
    } catch {
      toast.error('Failed to repair stock data');
    } finally {
      setRepairing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded text-[9px] font-black uppercase">Approved</span>;
      case 'rejected': return <span className="bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded text-[9px] font-black uppercase">Rejected</span>;
      default: return <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1"><Clock size={10} /> Pending</span>;
    }
  };

  const tabs = [
    { id: 'damage', label: 'Damage Return', roles: ['admin', 'superadmin', 'salesperson', 'prod_manager'] },
    { id: 'unsold', label: 'Unsold Return', roles: ['admin', 'superadmin', 'salesperson', 'prod_manager'] },
    { id: 'expiry', label: 'Expire Product', roles: ['admin', 'superadmin', 'salesperson', 'prod_manager'] },
    { id: 'approval', label: 'Approval', roles: ['admin', 'superadmin', 'prod_manager'] }
  ].filter(t => t.roles.includes(user?.role));

  const handleAddClick = () => {
    navigate(`/returns/${activeTab}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <RotateCcw size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Returns Management</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage reverse logistics & quality control</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <button
              onClick={handleRepairStock}
              disabled={repairing}
              className="h-11 px-4 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-amber-100 transition-all border border-amber-100 disabled:opacity-50"
              title="Fix 'Source Not Tracked' for legacy stock records"
            >
              {repairing ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
              <span className="hidden md:inline">Repair Origin Data</span>
            </button>
          )}

          {activeTab !== 'approval' && (
            <button
              onClick={handleAddClick}
              className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              <Plus size={16} /> Add {activeTab} Return
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/50 p-1 rounded-xl w-fit border border-slate-100 shadow-sm backdrop-blur-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab.id 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
            }`}
          >
            {tab.label} 
          </button>
        ))}
      </div>

      {/* Main Table Content */}
      <div className="bg-white border border-slate-200 rounded-4xl overflow-hidden shadow-sm shadow-slate-100/50">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-tight border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Record Details</th>
                <th className="px-6 py-5">Source / Destination</th>
                <th className="px-6 py-5 text-center">SKU Count</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-right w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-200 mx-auto" />
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-4">Syncing records...</p>
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-24 text-center">
                    <RotateCcw className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No matching records found</p>
                  </td>
                </tr>
              ) : returns.map((record) => (
                <tr key={record._id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${record.type === 'damage' ? 'bg-red-50 text-red-500 border-red-100' :
                        record.type === 'expiry' ? 'bg-orange-50 text-orange-500 border-orange-100' :
                          'bg-blue-50 text-blue-500 border-blue-100'
                        }`}>
                        <ClipboardList size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">#{record._id.slice(-6).toUpperCase()}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(record.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{record.locationId?.name || 'Local'}</p>
                      {record.type === 'unsold' && record.targetLocationId && (
                        <>
                          <ChevronRight size={12} className="text-slate-300" />
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{record.targetLocationId?.name}</p>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center font-black text-slate-700 text-xs">
                    {record.products.length} Items
                  </td>
                  <td className="px-6 py-6 text-center">
                    {getStatusBadge(record.status)}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {activeTab === 'approval' ? (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(record._id, 'approved')}
                            disabled={processingId === record._id}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all active:scale-90"
                            title="Approve"
                          >
                            {processingId === record._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(record._id, 'rejected')}
                            disabled={processingId === record._id}
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all active:scale-90"
                            title="Reject"
                          >
                            {processingId === record._id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                           {record.status === 'pending' && (record.initiatedBy?._id === user?._id || user?.role === 'admin' || user?.role === 'superadmin') && (
                             <button
                                onClick={() => handleCancel(record._id)}
                                disabled={processingId === record._id}
                                className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-all active:scale-90"
                                title="Cancel and Retract Return"
                             >
                                {processingId === record._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                             </button>
                           )}
                           <button
                             onClick={() => { setSelectedReturn(record); setShowDetailModal(true); }}
                             className="px-4 py-1.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-white hover:text-blue-600 transition-all"
                           >
                             Details
                           </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Integration */}
        {totalPages > 1 && (
          <Pagination 
            currentPage={page} 
            totalPages={totalPages} 
            onPageChange={setPage} 
          />
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Return Details #${selectedReturn?._id.slice(-6).toUpperCase()}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Initiated By</p>
              <p className="text-xs font-bold text-slate-700">{selectedReturn?.initiatedBy?.name || 'N/A'}</p>
              <p className="text-[9px] text-slate-500">{selectedReturn?.createdBy}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <div className="mt-1">{getStatusBadge(selectedReturn?.status)}</div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Product manifest</h3>
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3">Reason / Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {selectedReturn?.products.map((p, i) => (
                    <tr key={i} className="bg-white">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-700">{p.productId?.name}</p>
                        <p className="text-[9px] text-slate-400 uppercase">Code: {p.productId?.productCode}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-black text-blue-600">{p.quantity}</td>
                      <td className="px-4 py-3 text-slate-500 text-[10px] italic">{p.reason || 'No remark'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedReturn?.notes && (
            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
              <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Internal Notes</p>
              <p className="text-[11px] text-amber-800 font-medium leading-relaxed">{selectedReturn.notes}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ReturnsPage;
