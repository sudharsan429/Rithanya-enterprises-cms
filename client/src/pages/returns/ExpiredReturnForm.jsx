import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { 
  ArrowLeft, 
  Trash2, 
  Loader2, 
  Search,
  History,
  Info,
  Building2,
  Store
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../../components/CustomSelect';
import DatePicker from 'react-datepicker';
import { format, parseISO } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

const ExpiredReturnForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stock, setStock] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // itemId -> { quantity, expiryDate, notes }
  const [returnItems, setReturnItems] = useState({});
  const [canteens, setCanteens] = useState([]);
  const [productionUnits, setProductionUnits] = useState([]);
  const [assignedUnitName, setAssignedUnitName] = useState('');
  const [selectedSource, setSelectedSource] = useState({
    id: user?.assignedCanteen || '',
    type: 'Canteen'
  });

  // Custom Input for DatePicker
  const CustomDateInput = React.forwardRef(({ value, onClick }, ref) => (
    <button 
      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-orange-300 transition-all text-left" 
      onClick={onClick} 
      ref={ref}
      type="button"
    >
      {value || 'Pick Date'}
    </button>
  ));

  CustomDateInput.displayName = "CustomDateInput";

  // Fetch all locations for admins
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      api.get('/canteens?limit=100').then(res => {
        setCanteens(res.data.data || []);
      });
      api.get('/production-units?limit=100').then(res => {
        setProductionUnits(res.data.data || []);
      });
    }

    if (user?.role === 'salesperson' && user?.assignedProductionUnit) {
      api.get(`/production-units/${user.assignedProductionUnit}`).then(res => {
        setAssignedUnitName(res.data?.name || '');
      });
    }
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!selectedSource.id) {
        setStock([]);
        setLoading(false);
        return;
    }

    setLoading(true);
    try {
      const res = await api.get('/stock/levels', { 
        params: { locationId: selectedSource.id, locationType: selectedSource.type } 
      });
      setStock(res.data || []);
    } catch (_error) {
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, [selectedSource]);

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

  const updateItem = (stockId, field, value) => {
    setReturnItems(prev => ({
      ...prev,
      [stockId]: { ...prev[stockId], [field]: value }
    }));
  };

  const handleSubmit = async () => {
    const itemsByUnit = {};
    const entries = Object.entries(returnItems);

    for (const [stockId, data] of entries) {
      if (data.quantity > 0) {
        if (!data.expiryDate) {
           return toast.error('Expiry date is required for all recorded items');
        }
        if (!data.notes || data.notes.trim() === '') {
           return toast.error('Notes/Batch details are required for all recorded items');
        }
        
        const item = stock.find(s => s._id === stockId);
        const targetUnitId = item.sourceLocationId?._id || user.assignedProductionUnit;

        if (!targetUnitId) {
          return toast.error(`Origin unit not found for ${item.productId?.name}. Please contact admin.`);
        }

        if (!itemsByUnit[targetUnitId]) {
          itemsByUnit[targetUnitId] = [];
        }

        itemsByUnit[targetUnitId].push({
          productId: item.productId._id,
          categoryId: item.categoryId || item.productId.category,
          dailyStockId: item.dailyStockId, // Propagate batch ID
          quantity: parseInt(data.quantity) || 0,
          expiryDate: data.expiryDate,
          reason: data.notes
        });
      }
    }

    const unitEntries = Object.entries(itemsByUnit);
    if (unitEntries.length === 0) return toast.error('Please enter expired quantity for at least one item');

    setSubmitting(true);
    try {
      await Promise.all(unitEntries.map(([unitId, products]) => 
        api.post('/returns', {
          type: 'expiry',
          locationId: selectedSource.id,
          locationType: 'Canteen',
          targetLocationId: unitId,
          targetLocationType: 'ProductionUnit',
          products
        })
      ));
      
      toast.success('Expiry records saved successfully');
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
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">3. Expire Product</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Audit trail for non-sellable expired stock</p>
          </div>
        </div>
        
        <button 
          onClick={handleSubmit} disabled={submitting || loading}
          className="bg-orange-600 text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-orange-100"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={16} />}
          Save Records
        </button>
      </div>

      <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl flex gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-orange-100 shrink-0"><Info size={24} /></div>
        <div>
          <h3 className="text-xs font-black text-orange-800 uppercase tracking-widest mb-1">Administrative Audit</h3>
          <p className="text-[10px] text-orange-700 font-bold uppercase leading-relaxed opacity-80">
            This module generates an audit record for expired stock. Quantities are logged for reporting and performance analysis.
          </p>
        </div>
      </div>

      {(user?.role === 'admin' || user?.role === 'superadmin') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-slate-200 p-6 rounded-4xl shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Store size={20} /></div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Canteen Selection</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pick source store</p>
                  </div>
              </div>
              <CustomSelect 
                  options={canteens.map(c => ({ value: c._id, label: c.name }))}
                  value={selectedSource.type === 'Canteen' ? selectedSource.id : ''}
                  onChange={(val) => setSelectedSource({ id: val, type: 'Canteen' })}
                  placeholder="Select Canteen..."
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center"><Building2 size={20} /></div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Production Unit Selection</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pick source factory</p>
                  </div>
              </div>
              <CustomSelect 
                  options={productionUnits.map(p => ({ value: p._id, label: p.name }))}
                  value={selectedSource.type === 'ProductionUnit' ? selectedSource.id : ''}
                  onChange={(val) => setSelectedSource({ id: val, type: 'ProductionUnit' })}
                  placeholder="Select Unit..."
              />
            </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-4xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><History size={20} /></div>
               <div>
                  <h3 className="text-sm font-bold text-slate-800">Stock Ledger</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Entry expiry details</p>
               </div>
            </div>
            
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" placeholder="Filter stock..." value={searchTerm}
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
                <th className="px-6 py-5 text-center">Total Qty</th>
                <th className="px-6 py-5">Return Qty</th>
                <th className="px-6 py-5 text-center">Expiry Date</th>
                <th className="px-8 py-5 text-right">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                   <td colSpan="6" className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-200 mx-auto" /><p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-4">Loading stock...</p></td>
                </tr>
              ) : filteredStock.length === 0 ? (
                <tr>
                   <td colSpan="6" className="py-20 text-center text-slate-400"><p className="text-xs font-bold uppercase tracking-widest">No stock records found</p></td>
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
                  <td className="px-6 py-6 font-bold text-slate-700">
                    <p className="text-sm">{item.productId?.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Code: {item.productId?.productCode}</p>
                  </td>
                  <td className="px-6 py-6 text-center">
                     <div className="flex items-center justify-center gap-2">
                       <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-black">{item.quantity + item.damagedQuantity}</span>
                       <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{item.productId?.uom}</span>
                     </div>
                  </td>
                  <td className="px-6 py-6 font-bold text-orange-600">
                    <input 
                      type="text" 
                      value={returnItems[item._id]?.quantity || ''}
                      onChange={(e) => updateItem(item._id, 'quantity', e.target.value)}
                      onKeyDown={handleNumberKeyDown}
                      placeholder="0"
                      className="w-20 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-black text-orange-600 outline-none focus:bg-white focus:border-orange-500 transition-all shadow-sm"
                    />
                  </td>
                  <td className="px-6 py-6 text-center">
                    <DatePicker 
                      selected={returnItems[item._id]?.expiryDate ? parseISO(returnItems[item._id].expiryDate) : null}
                      onChange={(date) => updateItem(item._id, 'expiryDate', date ? format(date, 'yyyy-MM-dd') : '')}
                      customInput={<CustomDateInput />}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Pick date"
                      maxDate={new Date()}
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                    />
                  </td>
                  <td className="px-8 py-6 text-right">
                    <input 
                      type="text" placeholder="Batch details..." value={returnItems[item._id]?.notes || ''}
                      onChange={(e) => updateItem(item._id, 'notes', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-semibold focus:bg-white transition-all outline-none text-right"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpiredReturnForm;
