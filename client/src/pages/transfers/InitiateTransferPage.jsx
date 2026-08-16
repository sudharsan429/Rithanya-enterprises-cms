import React, { useState, useEffect, useCallback } from 'react';
import CustomSelect from '../../components/CustomSelect';
import api from '../../api/axios';
import {
  Loader2,
  ArrowLeft,
  Factory,
  Store,
  Plus,
  Trash2,
  ArrowRightLeft,
  Info,
  Package,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

const InitiateTransferPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const urlType = searchParams.get('type');

  const [productionUnits, setProductionUnits] = useState([]);
  const [canteens, setCanteens] = useState([]);
  const [eligibleProducts, setEligibleProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const defaultType = user?.role === 'salesperson' ? 'Canteen-to-Canteen' : 'PU-to-PU';
  const initialType = urlType || defaultType;

  const [activeTab, setActiveTab] = useState(initialType);

  const [formData, setFormData] = useState({
    transferType: initialType,
    fromLocation: { 
      id: user?.role === 'salesperson' ? (user.assignedCanteen || '') : (user?.role === 'prod_manager' ? (user.assignedProductionUnit || '') : ''), 
      type: (initialType === 'Canteen-to-Canteen') ? 'Canteen' : 'ProductionUnit' 
    },
    toLocation: { id: '', type: (initialType?.endsWith('Canteen') || initialType === 'Canteen-to-Canteen') ? 'Canteen' : 'ProductionUnit' },
    products: [{ productId: '', categoryId: '', quantity: '' }]
  });

  const fetchData = useCallback(async () => {
    try {
      const [puRes, canteenRes] = await Promise.all([
        api.get('/production-units?limit=100'),
        api.get('/canteens?limit=100')
      ]);
      setProductionUnits(puRes.data.data || []);
      setCanteens(canteenRes.data.data || []);

      if (isEdit) {
        const transRes = await api.get(`/transfers/${id}`);
        const t = transRes.data;
        setActiveTab(t.transferType);
        setFormData({
          transferType: t.transferType,
          fromLocation: { id: t.fromLocation.id._id, type: t.fromLocation.type },
          toLocation: { id: t.toLocation.id._id, type: t.toLocation.type },
          products: t.products.map(p => ({
            productId: p.productId._id,
            dailyStockId: p.dailyStockId,
            categoryId: p.categoryId,
            quantity: p.quantity
          }))
        });
      } else if (urlType) {
        setActiveTab(urlType);
        const fromType = urlType === 'Canteen-to-Canteen' ? 'Canteen' : 'ProductionUnit';
        const toType = urlType.endsWith('Canteen') ? 'Canteen' : (urlType === 'PU-to-PU' ? 'ProductionUnit' : 'Canteen');
        setFormData(prev => ({
          ...prev,
          transferType: urlType,
          fromLocation: { ...prev.fromLocation, type: fromType },
          toLocation: { ...prev.toLocation, type: toType }
        }));
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [id, isEdit, urlType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (tabId) => {
    if (isEdit) return;
    setActiveTab(tabId);
    let fromType = 'ProductionUnit';
    let toType = 'ProductionUnit';
    if (tabId === 'PU-to-Canteen') toType = 'Canteen';
    if (tabId === 'Canteen-to-Canteen') {
      fromType = 'Canteen';
      toType = 'Canteen';
    }

    setFormData({
      transferType: tabId,
      fromLocation: { id: '', type: fromType },
      toLocation: { id: '', type: toType },
      products: [{ productId: '', categoryId: '', quantity: '' }]
    });
  };

  useEffect(() => {
    if (isEdit) return;
    if (activeTab === 'PU-to-PU' || activeTab === 'PU-to-Canteen') {
      if (user.role === 'prod_manager' && user.assignedProductionUnit) {
        setFormData(prev => ({
          ...prev,
          fromLocation: { id: user.assignedProductionUnit, type: 'ProductionUnit' },
        }));
      }
    } else if (activeTab === 'Canteen-to-Canteen') {
      if (user.role === 'salesperson' && user.assignedCanteen) {
        setFormData(prev => ({
          ...prev,
          fromLocation: { id: user.assignedCanteen, type: 'Canteen' },
        }));
      }
    }
  }, [user, activeTab, isEdit]);

  useEffect(() => {
    const fetchEligibleProducts = async () => {
      if (!formData.fromLocation.id) {
        setEligibleProducts([]);
        return;
      }

      setProductsLoading(true);
      try {
        // Always fetch from stock/levels — one record per product per location
        const res = await api.get(`/stock/levels?locationId=${formData.fromLocation.id}&locationType=${formData.fromLocation.type}`);
        setEligibleProducts(
          res.data
            .filter(stock => stock.quantity > 0)
            .map(stock => ({
              _id: stock.productId._id,
              productId: stock.productId._id,
              name: stock.productId.name,
              categoryId: stock.categoryId,
              quantity: stock.quantity,
              code: stock.productId.productCode
            }))
        );
      } catch (err) {
        toast.error('Failed to fetch eligible products');
      } finally {
        setProductsLoading(false);
      }
    };
    fetchEligibleProducts();
  }, [formData.fromLocation.id, formData.fromLocation.type, activeTab]);

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

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, { productId: '', categoryId: '', quantity: '' }]
    }));
  };

  const removeItem = (index) => {
    const newProducts = [...formData.products];
    newProducts.splice(index, 1);
    setFormData(prev => ({ ...prev, products: newProducts }));
  };

  const updateItem = (index, field, value) => {
    const newProducts = [...formData.products];
    if (field === 'productId') {
      const selectedItem = eligibleProducts.find(p => p._id === value);
      
      // Proactive Duplicate Check — by productId only
      if (selectedItem) {
        const isDuplicate = formData.products.some((p, i) => 
          p.productId === selectedItem.productId && i !== index
        );
        if (isDuplicate) {
          toast.error('This product is already in the list');
          return;
        }
      }

      newProducts[index] = {
        ...newProducts[index],
        productId: selectedItem ? selectedItem.productId : '',
        categoryId: selectedItem ? selectedItem.categoryId : ''
      };
    } else {
      newProducts[index][field] = value;
    }

    if (field === 'quantity' && value !== '') {
      const item = newProducts[index];
      const selectedItem = eligibleProducts.find(p => p._id === item.productId);
      
      if (selectedItem && Number(value) > selectedItem.quantity) {
        toast.error(`Max available: ${selectedItem.quantity}`);
        newProducts[index].quantity = selectedItem.quantity;
      }
    }
    setFormData(prev => ({ ...prev, products: newProducts }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fromLocation.id || !formData.toLocation.id || !formData.products.some(p => p.productId && p.quantity)) {
      return toast.error('Please complete the form');
    }

    const productIds = formData.products.filter(p => p.productId).map(p => p.productId);
    const uniqueIds = new Set(productIds);
    if (uniqueIds.size !== productIds.length) {
      return toast.error('Duplicate products found in the items list');
    }

    // Sanitize products: remove empty dailyStockId strings to avoid cast errors
    const sanitizedProducts = formData.products
      .filter(p => p.productId && p.quantity)
      .map(p => {
        const product = { ...p };
        if (!product.dailyStockId || product.dailyStockId === '') {
          delete product.dailyStockId;
        }
        return product;
      });

    const submissionData = {
      ...formData,
      products: sanitizedProducts
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/transfers/${id}`, submissionData);
        toast.success('Transfer updated successfully');
      } else {
        await api.post('/transfers', submissionData);
        toast.success('Transfer initiated successfully');
      }
      navigate('/transfers');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'PU-to-PU', label: 'Unit to Unit', icon: Factory, roles: ['superadmin', 'admin', 'prod_manager'] },
    { id: 'PU-to-Canteen', label: 'Unit to Canteen', icon: Store, roles: ['superadmin', 'admin', 'prod_manager'] },
    { id: 'Canteen-to-Canteen', label: 'Canteen to Canteen', icon: ArrowRightLeft, roles: ['superadmin', 'admin', 'salesperson'] }
  ].filter(tab => tab.roles.includes(user?.role));

  const canEditFrom = user.role === 'admin' || user.role === 'superadmin';

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Transfer Details...</p>
    </div>
  );

  return (
    <div className="pb-32 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/transfers')}
              className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-800 uppercase tracking-widest leading-none">
                {isEdit ? 'Edit Pending Transfer' : 'Initiate New Transfer'}
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Ref: {isEdit ? id.slice(-8).toUpperCase() : 'NEW REQUEST'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isLocked = isEdit || !!urlType;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  disabled={isLocked}
                  className={`
                    flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all
                    ${isActive
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                      : 'text-slate-400 hover:text-slate-600'
                    }
                    ${isLocked && !isActive ? 'opacity-40 grayscale pointer-events-none' : ''}
                    ${isLocked && isActive ? 'cursor-default' : ''}
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-slate-300'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 sticky top-24">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Route Selection</h3>
              </div>

              <div className="space-y-4">
                <div className="">
                  <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">Source (From)</label>
                  <CustomSelect
                    options={(!canEditFrom && (activeTab.includes('PU') ? user.assignedProductionUnit : user.assignedCanteen))
                      ? (activeTab.includes('PU') ? productionUnits : canteens).filter(u => u._id === (activeTab.includes('PU') ? user.assignedProductionUnit : user.assignedCanteen)).map(u => ({ label: u.name, value: u._id }))
                      : (activeTab.includes('PU') ? productionUnits : canteens).map(u => ({ label: u.name, value: u._id }))
                    }
                    value={formData.fromLocation.id}
                    onChange={(val) => setFormData({ ...formData, fromLocation: { ...formData.fromLocation, id: val } })}
                    disabled={!canEditFrom || isEdit}
                    placeholder="Select Source..."
                  />
                </div>
                <div className="flex flex-col pt-2 items-center text-slate-200">
                  <ArrowRightLeft className="w-6 h-6 rotate-90 text-primary" />
                </div>
                <div className="">
                  <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">Destination (To)</label>
                  <CustomSelect
                    options={(activeTab.endsWith('Canteen') ? canteens : productionUnits)
                      .filter(u => u._id !== formData.fromLocation.id)
                      .map(u => ({ label: u.name, value: u._id }))
                    }
                    value={formData.toLocation.id}
                    onChange={(val) => setFormData({ ...formData, toLocation: { ...formData.toLocation, id: val } })}
                    disabled={isEdit}
                    placeholder="Select Destination..."
                  />
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-4 flex gap-3 border border-amber-100">
                <Info className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-[9px] text-amber-700 font-bold uppercase leading-relaxed">
                  Only {activeTab.replace(/-/g, ' ')} routes are permitted in this tab. Select a source to see quantity inventory.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-6 border-b border-slate-50 mb-6">
                <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-500" />
                  Product Inventory Match
                </h3>
                <button
                  onClick={handleAddItem}
                  className="text-[9px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Line Item
                </button>
              </div>

              <div className="space-y-4">
                {formData.products.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-100 group transition-all hover:border-blue-200">
                    <div className="col-span-12 md:col-span-7 space-y-1.5">
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Product</label>
                      <CustomSelect
                        options={eligibleProducts.map(p => ({ 
                          label: `${p.name}  [${p.quantity} qty]`, 
                          value: p._id 
                        }))}
                        value={item.productId || ''}
                        onChange={(val) => updateItem(index, 'productId', val)}
                        disabled={productsLoading || !formData.fromLocation.id}
                        placeholder={productsLoading ? 'Searching Inventory...' : 'Choose product...'}
                        isSearchable={true}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-4 space-y-1.5">
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        Transfer Qty {item.productId && `(Available: ${eligibleProducts.find(p => p._id === item.productId)?.quantity || 0})`}
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        onKeyDown={handleNumberKeyDown}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-12 md:col-span-1 pb-1">
                      {formData.products.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {!formData.fromLocation.id && (
                  <div className="py-20 text-center flex flex-col items-center gap-4 border-2 border-dashed border-slate-100 rounded-3xl">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center opacity-40">
                      <Package className="w-8 h-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Location Selection</p>
                      <p className="text-[9px] text-slate-300 font-medium uppercase mt-1">Products will appear once source is chosen</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 border-t border-slate-100 p-4 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Selection</p>
              <p className="text-[11px] font-bold text-slate-700">{formData.products.filter(p => p.productId).length} Unique SKU(s)</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/transfers')}
              className="px-8 py-3 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !formData.fromLocation.id || !formData.toLocation.id}
              className="bg-blue-600 text-white px-12 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> {isEdit ? 'Update Transfer Record' : 'Post Transfer Order'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitiateTransferPage;
