import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import {
  Loader2,
  ArrowLeft,
  PackageCheck,
  AlertCircle,
  Save,
  CheckCircle2,
  XCircle,
  Factory,
  Store,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const AcceptTransferFormPage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [itemsData, setItemsData] = useState([]); // { productId, name, originalQty, acceptedQty, damageQty, rejectedQty, remark, status, inspectionType }

  // Rejection Modal State
  const [rejectingIndex, setRejectingIndex] = useState(null);
  const [showLineRejectModal, setShowLineRejectModal] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectRemark, setBulkRejectRemark] = useState('');
  const [lineRejectRemark, setLineRejectRemark] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/transfers/${id}`);
      const t = res.data;

      // Basic role-based verification: Ensure the user's unit matches the destination
      const userAssignedId = (t.transferType.endsWith('Canteen')) ? user.assignedCanteen : user.assignedProductionUnit;
      const isAdmin = user.role === 'admin' || user.role === 'superadmin';

      if (!isAdmin && t.toLocation.id._id !== userAssignedId) {
        toast.error('Unauthorized access to this transfer');
        return navigate('/accept-transfers');
      }

      setTransfer(t);
      setItemsData(t.products.map(p => ({
        productId: p.productId._id,
        name: p.productId.name,
        code: p.productId.productCode,
        originalQty: p.quantity,
        acceptedQty: p.quantity,
        damageQty: '',
        rejectedQty: '',
        missingQty: '',
        status: 'accepted',
        remark: ''
      })));
    } catch (_error) {
      toast.error('Failed to load transfer details');
      navigate('/accept-transfers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNumberKeyDown = (e) => {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'];
    if (allowedKeys.includes(e.key) || (e.key >= '0' && e.key <= '9')) {
      return;
    }
    e.preventDefault();
  };

  const updateItem = (index, field, value) => {
    const newData = [...itemsData];
    const item = newData[index];

    if (field === 'status') {
      item.status = value;
      if (value === 'accepted') {
        item.rejectedQty = '';
        item.acceptedQty = item.originalQty - (item.damageQty || 0) - (item.missingQty || 0);
      }
    } else {
      const val = value === '' ? '' : Number(value);
      item[field] = val;

      const numVal = Number(val) || 0;

      // Unified Logic: Accepted = Sent - Damage - Missing
      if (field === 'damageQty' || field === 'missingQty') {
        const others = (field === 'damageQty') ? (Number(item.missingQty) || 0) : (Number(item.damageQty) || 0);
        
        // Cap the input if it exceeds original
        if (numVal + others > item.originalQty) {
          item[field] = item.originalQty - others;
        }
        
        item.acceptedQty = item.originalQty - (Number(item.damageQty) || 0) - (Number(item.missingQty) || 0);
        item.rejectedQty = '';
        item.status = (item.acceptedQty > 0 || item.damageQty > 0 || item.missingQty > 0) ? 'accepted' : 'rejected';
      }

      if(field === 'remark'){
        item.remark = value;
      }
    }

    setItemsData(newData);
  };

  const handleAcceptAll = () => {
    const updated = itemsData.map(item => ({
      ...item,
      acceptedQty: item.originalQty,
      damageQty: '',
      rejectedQty: '',
      missingQty: '',
      status: 'accepted'
    }));
    
    setItemsData(updated);
    toast.success('All items marked as fully accepted');
    handleSubmit(updated);
  };

  const handleBulkReject = () => {
    if (!bulkRejectRemark.trim()) {
      return toast.error('Please provide a reason for bulk rejection');
    }
    const updated = itemsData.map(item => ({
      ...item,
      acceptedQty: '',
      damageQty: '',
      rejectedQty: item.originalQty,
      missingQty: '',
      status: 'rejected',
      remark: bulkRejectRemark
    }));

    setItemsData(updated);
    setShowBulkRejectModal(false);
    setBulkRejectRemark('');
    toast.error('All items marked as rejected');
    handleSubmit(updated);
  };

  const openLineRejectModal = (index) => {
    setRejectingIndex(index);
    setShowLineRejectModal(true);
  };

  const confirmLineReject = () => {
    if (!lineRejectRemark.trim()) {
      return toast.error('Please provide a reason for rejection');
    }
    const newData = [...itemsData];
    const item = newData[rejectingIndex];

    item.acceptedQty = 0;
    item.damageQty = 0;
    item.rejectedQty = item.originalQty;
    item.missingQty = 0;
    item.status = 'rejected';
    item.remark = lineRejectRemark;

    setItemsData(newData);
    setShowLineRejectModal(false);
    setRejectingIndex(null);
    setLineRejectRemark('');
    toast.error(`${item.name} rejected`);
  };

  const handleSubmit = async (directData = null) => {
    // When called directly from onClick, directData is the Event object.
    // We only use directData if it's explicitly passed as an array (Bulk Actions).
    const dataToSubmit = Array.isArray(directData) ? directData : itemsData;

    // Validation: Total check
    const hasIncomplete = dataToSubmit.some(item => {
      const total = Number(item.acceptedQty || 0) + 
                    Number(item.damageQty || 0) + 
                    Number(item.rejectedQty || 0) + 
                    Number(item.missingQty || 0);
      return Math.abs(total - item.originalQty) > 0.001;
    });

    if (hasIncomplete) {
      return toast.error('Total items (Accepted + Damaged + Rejected + Missing) must equal the original Sent Quantity for every product.');
    }

    setSubmitting(true);
    try {
      const payload = {
        products: dataToSubmit.map(item => ({
          productId: item.productId,
          acceptedQty: Number(item.acceptedQty) || 0,
          damageQty: Number(item.damageQty) || 0,
          rejectedQty: Number(item.rejectedQty) || 0,
          missingQty: Number(item.missingQty) || 0,
          status: item.status,
          remark: item.remark || ''
        }))
      };

      await api.put(`/transfers/${id}/accept`, payload);
      toast.success('Inventory transfer processed and finalized successfully');
      
      setItemsData([]);
      setTimeout(() => {
        navigate('/accept-transfers');
      }, 1000);
    } catch (_error) {
      toast.error(_error.response?.data?.message || 'Failed to process inventory acceptance');
    } finally {
      setSubmitting(false);
    }
  };

  const isCompleted = transfer?.overallStatus === 'completed';

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Transfer for Inspection...</p>
    </div>
  );

  return (
    <div className="pb-32 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/accept-transfers')}
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-800 uppercase tracking-widest leading-none flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-blue-500" />
              Stock Inspection & Verification
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Ref: {transfer._id.toUpperCase()} • Type: {transfer.transferType.replace(/-/g, ' ')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!isCompleted && (
            <>
              <button
                onClick={handleAcceptAll}
                className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-emerald-100 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Quick Accept All
              </button>
              <button
                onClick={() => setShowBulkRejectModal(true)}
                className="bg-rose-50 text-rose-600 border border-rose-100 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-rose-100 transition-all flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Quick Reject All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
            {transfer.fromLocation.type === 'Canteen' ? <Store className="w-5 h-5" /> : <Factory className="w-5 h-5" />}
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Shipped From</p>
            <p className="text-xs font-bold text-slate-800 truncate">{transfer.fromLocation.id.name}</p>
          </div>
        </div>
        <div className="flex items-center justify-center text-slate-200">
          <ChevronRight className="w-8 h-8" />
        </div>
        <div className="bg-white p-4 rounded-2xl border border-blue-100 flex items-center gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50/50 rounded-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 relative z-10 shadow-lg shadow-blue-100">
            {transfer.toLocation.type === 'Canteen' ? <Store className="w-5 h-5" /> : <Factory className="w-5 h-5" />}
          </div>
          <div className="relative z-10 overflow-hidden">
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Receiving Terminal (Destination)</p>
            <p className="text-xs font-bold text-slate-800 truncate">{transfer.toLocation.id.name}</p>
          </div>
        </div>
      </div>


      {/* Items Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-8 py-5">Product SKU</th>
              <th className="px-6 py-5 text-center">Sent</th>
              <th className="px-6 py-5 text-center">Inspection Details</th>
              <th className="px-6 py-5 text-center">Result</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {itemsData.map((item, index) => (
              <tr key={index} className="hover:bg-blue-50/20 transition-all group">
                <td className="px-8 py-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase">{item.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 tracking-widest"># {item.code}</p>
                  </div>
                </td>
                <td className="px-6 py-6 text-center">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 shadow-sm">
                    {item.originalQty}
                  </span>
                </td>
                <td className="px-6 py-6 min-w-[320px]">
                  <div className="flex flex-col gap-4">
                   
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-bold text-slate-400 uppercase">Damage Count</label>
                          <input
                            type="text"
                            className="w-full bg-amber-50 border border-amber-500 rounded-xl px-4 py-2 text-xs font-bold text-amber-700 focus:bg-white transition-all outline-none"
                            value={item.damageQty}
                            onChange={(e) => updateItem(index, 'damageQty', e.target.value)}
                            onKeyDown={handleNumberKeyDown}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-bold text-slate-400 uppercase">Missing Item</label>
                          <input
                            type="text"
                            className="w-full bg-orange-50 border border-amber-800 rounded-xl px-4 py-2 text-xs font-bold text-amber-900 focus:bg-white transition-all outline-none"
                            value={item.missingQty}
                            onChange={(e) => updateItem(index, 'missingQty', e.target.value)}
                            onKeyDown={handleNumberKeyDown}
                          />
                        </div>
                      </div>
                   

                    {/* Discrepancy Remark Field */}
                    {(item.status === 'rejected' || item.damageQty > 0 || item.missingQty > 0) && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <div className="relative">
                          <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-400" />
                          <input
                            type="text"
                            placeholder="Reason for discrepancy/rejection..."
                            className="w-full bg-rose-50/30 border border-rose-100 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-rose-600 placeholder:text-rose-300 focus:bg-white focus:border-rose-400 transition-all outline-none shadow-inner"
                            value={item.remark}
                            onChange={(e) => updateItem(index, 'remark', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Progress Bar Visualizer */}
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${(item.acceptedQty / item.originalQty) * 100}%` }}
                      />
                      <div
                        className="bg-amber-500 h-full transition-all duration-500 shadow-lg shadow-amber-200/50"
                        style={{ width: `${(item.damageQty / item.originalQty) * 100}%` }}
                      />
                      <div
                        className="bg-rose-500 h-full transition-all duration-500"
                        style={{ width: `${(item.rejectedQty / item.originalQty) * 100}%` }}
                      />
                      <div
                        className="bg-slate-400 h-full transition-all duration-500"
                        style={{ width: `${(item.missingQty / item.originalQty) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>

                
                  <td className="px-6 py-6 text-center">
                    <div className="flex flex-col items-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Recv. Qty</p>
                      <span className="text-sm font-bold text-blue-600">{item.acceptedQty}</span>
                    </div>
                  </td>
                
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end items-center gap-3">
                    {!isCompleted && (
                      item.status !== 'rejected' ? (
                        <button
                          onClick={() => openLineRejectModal(index)}
                          className="p-2.5 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all shadow-sm"
                          title="Reject Item"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => updateItem(index, 'status', 'accepted')}
                          className="p-2.5 bg-blue-50 text-blue-500 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all shadow-sm flex items-center gap-2 text-[8px] font-bold uppercase px-3"
                          title="Undo Rejection"
                        >
                          Undo Reject
                        </button>
                      )
                    )}
                    {isCompleted && (
                      <span className={`px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest border ${item.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          item.missingQuantity > 0 ? 'bg-slate-50 text-slate-500 border-slate-200' :
                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                        {item.status || 'Received'}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-6 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inspection Summary</p>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-xs font-bold text-slate-700">{itemsData.reduce((acc, i) => acc + i.acceptedQty, 0)} OK</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-xs font-bold text-slate-700">{itemsData.reduce((acc, i) => acc + i.damageQty, 0)} DAMAGED</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-rose-500 rounded-full" />
                  <span className="text-xs font-bold text-slate-700">{itemsData.reduce((acc, i) => acc + i.rejectedQty, 0)} REJECTED</span>
                </div>
                <div className="flex items-center gap-1.5 border-l border-slate-100 pl-4">
                  <div className="w-2 h-2 bg-slate-400 rounded-full" />
                  <span className="text-xs font-bold text-slate-700">{itemsData.reduce((acc, i) => acc + i.missingQty, 0)} MISSING</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/accept-transfers')}
              disabled={submitting}
              className="px-10 py-3 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
            >
              {isCompleted ? 'Return to Queue' : 'Abort Session'}
            </button>
            {!isCompleted && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 text-white px-12 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Finalize Inspection & Update Stock</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Reject Modal */}
      {showBulkRejectModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowBulkRejectModal(false)} />
          <div className="bg-white rounded-3xl w-full max-w-md p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                <XCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Bulk Rejection Confirmation</h2>
                <p className="text-sm text-slate-500">Are you sure you want to reject ALL items? This will prevent any stock movement into your local unit.</p>
              </div>

              <div className="w-full space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  <MessageSquare className="w-3 h-3" /> Rejection Reason
                </label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all outline-none min-h-[100px] shadow-inner"
                  placeholder="Provide a general reason for rejecting this entire order..."
                  value={bulkRejectRemark}
                  onChange={(e) => setBulkRejectRemark(e.target.value)}
                />
              </div>

              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setShowBulkRejectModal(false)} className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={handleBulkReject} className="flex-1 bg-rose-600 text-white px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-rose-100 active:scale-95 transition-all">Reject All Items</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Reject Modal */}
      {showLineRejectModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLineRejectModal(false)} />
          <div className="bg-white rounded-3xl w-full max-w-md p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Reject Product Line</h2>
                <p className="text-sm text-slate-500">Are you sure you want to reject <span className="font-bold text-rose-600">{itemsData[rejectingIndex]?.name}</span>? This item will not be added to your inventory.</p>
              </div>

              <div className="w-full space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  <MessageSquare className="w-3 h-3" /> Rejection Remark
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all outline-none shadow-inner"
                  placeholder="Why are you rejecting this item?"
                  value={lineRejectRemark}
                  onChange={(e) => setLineRejectRemark(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => {
                  setShowLineRejectModal(false);
                  setLineRejectRemark('');
                }} className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={confirmLineReject} className="flex-1 bg-rose-600 text-white px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-rose-100 active:scale-95 transition-all">Reject Item</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcceptTransferFormPage;
