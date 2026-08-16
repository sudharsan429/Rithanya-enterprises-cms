import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  Search,
  Building2,
  PackageCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../../components/CustomSelect';

const UnsoldReturnForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [returnItems, setReturnItems] = useState({});
  const [canteens, setCanteens] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assignedUnitName, setAssignedUnitName] = useState('');
  const [selectedSourceLocation, setSelectedSourceLocation] = useState(user?.assignedCanteen || '');

  // Fetch all canteens for admins to select source
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      api.get('/canteens?limit=100').then(res => {
        setCanteens(res.data.data || []);
      });
    }

    if (user?.role === 'salesperson' && user?.assignedProductionUnit) {
      api.get(`/production-units/${user.assignedProductionUnit}`).then(res => {
        setAssignedUnitName(res.data?.name || '');
      });
    }
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!selectedSourceLocation) {
        setStock([]);
        setLoading(false);
        return;
    }

    setLoading(true);
    try {
      const stockRes = await api.get('/stock/levels', { params: { locationId: selectedSourceLocation, locationType: 'Canteen' } });
      setStock(stockRes.data || []);
    } catch (_error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedSourceLocation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNumberKeyDown = (e) => {
    if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
        (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
        (e.keyCode >= 35 && e.keyCode <= 40)) {
             return;
    }
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
    }
  };

  const handleQtyChange = (stockId, value, max) => {
    const qty = parseInt(value) || 0;
    if (qty < 0) return;
    if (qty > max) {
      toast.error(`Value exceeds available stock (${max})`);
      return;
    }
    setReturnItems(prev => ({
      ...prev,
      [stockId]: { ...prev[stockId], quantity: qty }
    }));
  };

  const handleReasonChange = (stockId, value) => {
    setReturnItems(prev => ({
      ...prev,
      [stockId]: { ...prev[stockId], reason: value }
    }));
  };

  const handleSubmit = async () => {
    const itemsByUnit = {};
    const entries = Object.entries(returnItems);

    for (const [stockId, data] of entries) {
      if (data.quantity > 0) {
        const item = stock.find(s => s._id === stockId);
        const targetUnitId = item.sourceLocationId?._id || user.assignedProductionUnit;

        if (!targetUnitId) {
          return toast.error(`Origin unit not found for ${item.productId?.name}.`);
        }

        if (!itemsByUnit[targetUnitId]) {
          itemsByUnit[targetUnitId] = [];
        }

        itemsByUnit[targetUnitId].push({
          productId: item.productId._id,
          categoryId: item.categoryId || item.productId.category,
          dailyStockId: item.dailyStockId, // Propagate batch ID
          quantity: data.quantity,
          reason: data.reason || 'Unsold return'
        });
      }
    }

    const unitEntries = Object.entries(itemsByUnit);
    if (unitEntries.length === 0) {
      return toast.error('Please enter quantity for at least one item');
    }

    setSubmitting(true);
    try {
      await Promise.all(unitEntries.map(([unitId, products]) => 
        api.post('/returns', {
          type: 'unsold',
          locationId: selectedSourceLocation,
          locationType: 'Canteen',
          targetLocationId: unitId,
          targetLocationType: 'ProductionUnit',
          products
        })
      ));

      toast.success('Unsold return(s) initiated for approval');
      navigate('/returns');
    } catch (_error) {
      toast.error(_error.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStock = stock.filter(item => 
    item.productId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.productId?.productCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/returns')} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-100"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">2. Unsold Return</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Return undamaged stock to production unit for credit</p>
          </div>
        </div>
        
        <button 
          onClick={handleSubmit}
          disabled={submitting || loading}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-100"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
          Save Records
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-4">
             {/* Admin Source Selector */}
             {(user?.role === 'admin' || user?.role === 'superadmin') && (
                <div className="bg-white border border-slate-200 p-6 rounded-4xl shadow-sm space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm"><Building2 size={20} /></div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Source Store</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pick canteen</p>
                      </div>
                   </div>
                   <CustomSelect
                      options={canteens.map(c => ({ value: c._id, label: c.name }))}
                      value={selectedSourceLocation}
                      onChange={setSelectedSourceLocation}
                      placeholder="Choose Canteen..."
                   />
                </div>
             )}

             <div className="bg-blue-50 border border-blue-100 p-6 rounded-4xl shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm"><PackageCheck size={20} /></div>
                   <h3 className="text-sm font-bold text-blue-900">Return Policy</h3>
                </div>
                <p className="text-[10px] text-blue-700 font-bold uppercase tracking-tight leading-relaxed">
                  Unsold items must be returned to their respective production units for credit. 
                  {user.role === 'salesperson' ? ' Your returns are locked to your assigned unit.' : ' Select the destination unit for each product row.'}
                </p>
             </div>
          </div>

         <div className="md:col-span-3">
            <div className="bg-white border border-slate-200 rounded-4xl overflow-hidden shadow-sm h-full">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><PackageCheck size={20} /></div>
                     <div>
                        <h3 className="text-sm font-bold text-slate-800">Inventory to Return</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Select products and quantities</p>
                     </div>
                  </div>
                  
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search products..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-2.5 text-xs font-semibold focus:bg-white focus:border-blue-500 transition-all outline-none"
                    />
                  </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5">Production Unit</th>
                      <th className="px-6 py-5">Product Details</th>
                      <th className="px-6 py-5 text-center">Undamage Qty</th>
                      <th className="px-6 py-5">Return Qty</th>
                      <th className="px-8 py-5 text-right w-40">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                      <td colSpan="5" className="py-20 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-200 mx-auto" />
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-4">Loading stock...</p>
                      </td>
                      </tr>
                    ) : filteredStock.length === 0 ? (
                      <tr>
                      <td colSpan="5" className="py-20 text-center text-slate-400"><p className="text-xs font-bold uppercase tracking-widest">No stock records found</p></td>
                      </tr>
                    ) : filteredStock.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6 min-w-[200px]">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center border border-slate-100 shadow-sm">
                                    <Building2 size={14} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest truncate max-w-[130px]">
                                        {item.sourceLocationId?.name || assignedUnitName || 'Source Not Tracked'}
                                    </span>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Automatic</span>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-sm font-bold text-slate-700">{item.productId?.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Code: {item.productId?.productCode}</p>
                        </td>
                        <td className="px-6 py-6 text-center">
                           <div className="flex items-center justify-center gap-2">
                             <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black">{item.quantity}</span>
                             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{item.productId?.uom}</span>
                           </div>
                        </td>
                        <td className="px-6 py-6 font-bold text-blue-600">
                          <input 
                            type="text" 
                            value={returnItems[item._id]?.quantity || ''}
                            onChange={(e) => handleQtyChange(item._id, e.target.value, item.quantity)}
                            onKeyDown={handleNumberKeyDown}
                            placeholder="0"
                            className={`w-24 bg-slate-50 border ${returnItems[item._id]?.quantity > 0 ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100'} rounded-xl px-4 py-2 text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm`}
                          />
                        </td>
                        <td className="px-8 py-6 text-right">
                          <input 
                            type="text" placeholder="Remark"
                            value={returnItems[item._id]?.reason || ''}
                            onChange={(e) => handleReasonChange(item._id, e.target.value)}
                            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-semibold focus:bg-white focus:border-blue-500 transition-all outline-none text-right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default UnsoldReturnForm;
