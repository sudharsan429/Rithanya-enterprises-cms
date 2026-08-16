import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import {
  Loader2,
  Package,
  ArrowLeft,
  Trash2,
  Save,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../../components/CustomSelect';

const DailyStockFormPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [productionUnits, setProductionUnits] = useState([]);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    productionUnitId: '',
    items: []
  });

  const fetchDependencies = useCallback(async () => {
    try {
      const [puRes, prodRes] = await Promise.all([
        api.get('/production-units'),
        api.get('/products')
      ]);
      setProductionUnits(puRes.data.data || []);
      setProducts(prodRes.data.data || []);

      // If user is prod_manager, auto-set their unit
      if (user?.role === 'prod_manager' && user.assignedProductionUnit) {
        setFormData(prev => ({ ...prev, productionUnitId: user.assignedProductionUnit }));
      }
    } catch (_error) {
      toast.error('Failed to load form data');
    }
  }, [user]);

  const fetchExistingEntry = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/stock/daily/${id}`);
      const entry = res.data;
      if (entry) {
        if (entry.isLocked) {
          toast.error('Cannot edit: Stock already transferred');
          return navigate('/daily-stock');
        }
        setFormData({
          date: entry.date.split('T')[0],
          productionUnitId: entry.productionUnitId._id,
          items: entry.products.map(p => ({
            productId: p.productId._id,
            categoryId: p.categoryId,
            quantity: p.quantity,
            costPrice: p.costPrice,
            price: p.price,
            lowStockThreshold: p.lowStockThreshold,
            status: p.status || 'onstock'
          }))
        });
      }
    } catch (_error) {
      toast.error('Failed to load entry');
      navigate('/daily-stock');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDependencies();
    if (isEditing) fetchExistingEntry();
  }, [fetchDependencies, fetchExistingEntry, isEditing]);

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', categoryId: '', quantity: '', costPrice: '', price: '', lowStockThreshold: '', status: 'onstock' }]
    }));
  };

  const handleNumberKeyDown = (e) => {
    // Allow: backspace, delete, tab, escape, enter, .
    if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
      // Allow: Ctrl+A, Command+A
      (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
      // Allow: home, end, left, right, down, up
      (e.keyCode >= 35 && e.keyCode <= 40)) {
      // let it happen, don't do anything
      return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    if (field === 'productId' && value) {
      // Check for Duplicate Product
      const isDuplicate = formData.items.some((item, i) => item.productId === value && i !== index);
      if (isDuplicate) {
        toast.error('This product is already in the list');
        return;
      }

      const product = products.find(p => p._id === value);
      newItems[index] = {
        ...newItems[index],
        productId: value,
        categoryId: product ? product.category : '',
        costPrice: product ? product.price : 0, 
        price: product ? product.price : 0,
        lowStockThreshold: product ? product.lowStock : 0,
        uom: product ? product.uom : ''
      };
    } else {
      newItems[index][field] = value;
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productionUnitId || !formData.items.length) {
      return toast.error('Please fill all required fields');
    }

    // Improved Item Validation
    const seenProducts = new Set();
    for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        if (!item.productId) return toast.error(`Product is missing at line ${i+1}`);
        
        if (seenProducts.has(item.productId)) {
          return toast.error(`Duplicate product found at line ${i+1}`);
        }
        seenProducts.add(item.productId);

        if (!item.quantity || Number(item.quantity) <= 0) return toast.error(`Please enter valid quantity for item ${i+1}`);
        if (!item.price || Number(item.price) <= 0) return toast.error(`Selling price is required for item ${i+1}`);
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        products: formData.items.map(item => ({
          productId: item.productId,
          categoryId: item.categoryId,
          quantity: Number(item.quantity),
          costPrice: Number(item.costPrice),
          price: Number(item.price),
          lowStockThreshold: Number(item.lowStockThreshold),
          status: item.status || 'onstock'
        }))
      };

      if (isEditing) {
        await api.put(`/stock/daily/${id}`, payload);
        toast.success('Stock entry updated successfully');
      } else {
        await api.post('/stock/daily', payload);
        toast.success('Daily stock recorded successfully');
      }
      navigate('/daily-stock');
    } catch (_error) {
      toast.error(_error.response?.data?.message || 'Failed to save stock');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/daily-stock')}
            className="p-2.5 rounded-xl bg-white text-slate-400 hover:text-slate-600 border border-slate-200 shadow-sm transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {isEditing ? 'Edit Stock Entry' : 'Manual Stock Entry'}
            </h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
              {isEditing ? 'Modify existing record' : 'Daily Inventory update'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <CustomSelect
              label="Production Unit"
              options={productionUnits.map(pu => ({ label: pu.name, value: pu._id }))}
              value={formData.productionUnitId}
              onChange={(val) => setFormData({ ...formData, productionUnitId: val })}
              disabled={user?.role === 'prod_manager' && !!user.assignedProductionUnit}
              placeholder="Select Production Unit..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Recording Date</label>
            <div className="flex h-[42px] items-center px-4 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-600">
              <Calendar className="w-4 h-4 mr-2 text-slate-400" />
              {new Date(formData.date).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest">
              <Package className="w-4 h-4 text-blue-500" /> Items List
            </h3>
            <button
              onClick={handleAddItem}
              className="text-blue-600 px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-blue-50 transition-all border border-blue-100 uppercase tracking-widest"
            >
              + Add Product
            </button>
          </div>

          <div className="space-y-3">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-200 transition-all group relative">
                <div className="md:col-span-3">
                  <CustomSelect
                    label="Product Name"
                    options={products.map(p => ({ label: p.name, value: p._id }))}
                    value={item.productId}
                    onChange={(val) => handleItemChange(index, 'productId', val)}
                    placeholder="Search Product..."
                  />

                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">Cost Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">₹</span>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-7 pr-4 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all"
                      value={item.costPrice}
                      disabled
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantity</label>
                    {item.uom && <span className="text-[9px] font-black text-blue-500 uppercase tracking-tight bg-blue-50 px-1.5 rounded-md leading-none py-0.5">{item.uom}</span>}
                  </div>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    onKeyDown={handleNumberKeyDown}
                    placeholder="0"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">Selling Price (POS)</label>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-[10px] transition-colors group-focus-within:text-indigo-600">₹</span>
                    <input
                      type="text"
                      className="w-full bg-indigo-50/30 border border-indigo-100 rounded-xl pl-7 pr-4 py-2.5 text-xs font-black text-indigo-700 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm group-hover:border-indigo-200"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      onKeyDown={handleNumberKeyDown}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest ml-1">Stock Threshold</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-400 focus:bg-white focus:border-blue-300 outline-none transition-all italic"
                    value={item.lowStockThreshold}
                    onChange={(e) => handleItemChange(index, 'lowStockThreshold', e.target.value)}
                    onKeyDown={handleNumberKeyDown}
                    placeholder="0"
                  />
                </div>
                <div className="md:col-span-1 flex items-end justify-center pb-2">
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="w-9 h-9 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center border border-transparent hover:border-red-100 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {formData.items.length === 0 && (
              <div className="py-20 text-center space-y-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                  <Package className="w-8 h-8 text-slate-200" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Products Added</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest leading-none">Choose products to record stock levels</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer (Sticky) */}
        <div className="fixed bottom-0 right-0 left-20 lg:left-64 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 flex justify-end gap-3 z-30 transition-all duration-300">
          <div className="max-w-5xl w-full mx-auto flex justify-end gap-3 px-6">
            <button
              type="button"
              onClick={() => navigate('/daily-stock')}
              className="px-8 py-3 bg-white text-slate-500 rounded-xl text-[10px] font-bold hover:bg-slate-50 border border-slate-200 transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 text-white pl-8 pr-10 py-3 rounded-xl text-[10px] font-bold shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3 uppercase tracking-widest"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Update Stock Record' : 'Record Daily Stock'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyStockFormPage;
