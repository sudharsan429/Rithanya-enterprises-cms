import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingCart, Search, Loader2, Package,
  X, Save, CheckCircle, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import BillReceipt from '../../components/BillReceipt';
import CustomSelect from '../../components/CustomSelect';
import api from '../../api/axios';

// Extracted Components
import ProductCard from './components/ProductCard';
import CartItem from './components/CartItem';
import SettlementSection from './components/SettlementSection';
import PaymentModes from './components/PaymentModes';
import ReprintButton from './components/ReprintButton';

const BillingPage = () => {
  const { user } = useAuth();
  const [canteens, setCanteens] = useState([]);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCanteen, setSelectedCanteen] = useState(user?.assignedCanteen || '');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [showDrawer, setShowDrawer] = useState(false);

  const [paymentMode, setPaymentMode] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [splitCash, setSplitCash] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const contentRef = useRef(null);

  const handlePrintPDF = (saleData) => {
    const sale = saleData || lastSale;
    if (!sale) return;
    // Small delay to let React render the updated BillReceipt with latest sale data
    setTimeout(() => window.print(), 100);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [puRes, prodRes] = await Promise.all([
        api.get('/canteens?limit=100'),
        api.get('/products?limit=1000')
      ]);
      setCanteens(puRes.data.data || []);
      setProducts(prodRes.data.data || []);

      if (selectedCanteen) {
        const stockRes = await api.get(`/stock/levels?locationId=${selectedCanteen}&locationType=Canteen`);
        setStock(stockRes.data || []);
      }
    } catch (_error) {
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, [selectedCanteen]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const subtotal = React.useMemo(() =>
    cart.reduce((acc, item) => acc + (Number(item.priceAtSale) * Number(item.quantity)), 0),
    [cart]);

  const totalAmount = React.useMemo(() =>
    Math.max(0, subtotal - (Number(discountValue) || 0)),
    [subtotal, discountValue]);

  const changeAmount = React.useMemo(() =>
    paymentMode === 'cash' ? Math.max(0, (Number(cashReceived) || 0) - totalAmount) : 0,
    [paymentMode, cashReceived, totalAmount]);

  const splitUPI = React.useMemo(() =>
    paymentMode === 'split' ? Math.max(0, totalAmount - (Number(splitCash) || 0)) : 0,
    [paymentMode, totalAmount, splitCash]);

  const handleNumberKeyDown = React.useCallback((e) => {
    if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
      (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
      (e.keyCode >= 35 && e.keyCode <= 40)) {
      return;
    }
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  }, []);

  const addToCart = React.useCallback((stockItem) => {
    const product = stockItem.productId;
    const available = stockItem.quantity || 0;
    const dailyStockId = stockItem.dailyStockId;

    if (available <= 0) return toast.error('Out of stock');

    setCart(prev => {
      const existing = prev.find(item => item.productId === product._id && item.dailyStockId === dailyStockId);
      if (existing) {
        if (existing.quantity >= available) {
          toast.error('Max stock reached');
          return prev;
        }
        return prev.map(item =>
          (item.productId === product._id && item.dailyStockId === dailyStockId) ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      const itemPrice = (stockItem && stockItem.price > 0) ? stockItem.price : (product.price || 0);
      return [...prev, {
        productId: product._id,
        dailyStockId: dailyStockId,
        dailyStockDate: stockItem.dailyStockId?.date || stockItem.dailyStockId?.createdAt,
        categoryId: stockItem.categoryId,
        name: product.name,
        priceAtSale: itemPrice,
        originalPrice: itemPrice,
        costPrice: stockItem?.costPrice || 0,
        quantity: 1,
        uom: product.uom,
        maxStock: available,
        productCode: product.productCode
      }];
    });
  }, []);

  const updateCartItem = React.useCallback((id, dailyStockId, field, value) => {
    setCart(prev => prev.map(item => {
      if (item.productId === id && item.dailyStockId === dailyStockId) {
        let newValue = value;
        if (field === 'quantity') newValue = Math.max(1, Math.min(item.maxStock, value));
        if (field === 'priceAtSale') newValue = Math.max(0, value);
        return { ...item, [field]: newValue };
      }
      return item;
    }));
  }, []);

  const removeFromCart = React.useCallback((id, dailyStockId) =>
    setCart(prev => prev.filter(item => !(item.productId === id && item.dailyStockId === dailyStockId))),
    []);

  const handleCheckout = async (shouldPrint = false) => {
    if (!selectedCanteen) return toast.error('Please select a canteen terminal');
    if (!cart.length) return toast.error('Cart is empty');
    setSubmitting(true);
    if (shouldPrint) setIsPrinting(true);
    try {
      let finalDetails = {
        cashAmount: 0,
        upiAmount: 0,
        discountAmount: Number(discountValue) || 0,
        cashReceived: Number(cashReceived) || totalAmount,
        changeAmount: changeAmount
      };
      if (paymentMode === 'cash') finalDetails.cashAmount = totalAmount;
      if (paymentMode === 'upi') finalDetails.upiAmount = totalAmount;
      if (paymentMode === 'split') { finalDetails.cashAmount = splitCash; finalDetails.upiAmount = splitUPI; }

      const res = await api.post('/sales', {
        canteenId: selectedCanteen,
        items: cart.map(i => ({ 
          productId: i.productId, 
          categoryId: i.categoryId,
          dailyStockId: i.dailyStockId,
          quantity: i.quantity, 
          priceAtSale: i.priceAtSale, 
          uom: i.uom,
          subtotal: i.priceAtSale * i.quantity 
        })),
        totalAmount, paymentMode, paymentDetails: finalDetails
      });

      toast.success('Sale completed successfully!');
      setLastSale(res.data);
      setCart([]); setDiscountValue(0); setCashReceived(0); setSplitCash(0);
      setShowSuccess(true); fetchData(); setShowDrawer(false);

      if (shouldPrint) {
        handlePrintPDF(res.data);
      }
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Checkout failed');
    } finally {
      setSubmitting(false);
      if (!shouldPrint) setIsPrinting(false);
    }
  };

  const filteredStock = stock.filter(s => {
    const matchesSearch = s.productId.name.toLowerCase().includes(search.toLowerCase()) ||
      s.productId.productCode.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  if (loading && !stock.length) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full lg:h-[calc(100vh-140px)] pb-24 lg:pb-0 font-outfit max-w-[1920px] mx-auto overflow-hidden">

      <div className="receipt-offscreen">
        <BillReceipt ref={contentRef} sale={lastSale} />
      </div>

      <div className={`flex-1 flex flex-col gap-4 no-print overflow-hidden transition-all duration-300 ${showDrawer ? 'lg:pr-4' : ''}`}>
        <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center gap-3 shadow-sm">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-600 w-4 h-4 transition-colors" />
            <input
              type="text"
              placeholder="Search SKU or Product Name..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm font-medium shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <div className="w-full sm:w-64">
                <CustomSelect
                  options={canteens.map(c => ({ label: c.name, value: c._id }))}
                  value={selectedCanteen}
                  onChange={setSelectedCanteen}
                  placeholder="Select Canteen"
                />
              </div>
            )}
            <ReprintButton 
              lastSale={lastSale} 
              onPrint={handlePrintPDF} 
              disabled={submitting} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 overflow-y-auto pr-1 pb-4 scrollbar-hide min-h-0">
          {filteredStock.map((s) => (
            <ProductCard
              key={s._id}
              product={s.productId}
              stockItem={s}
              onAdd={() => addToCart(s)}
            />
          ))}
        </div>
      </div>

      <div className={`
        fixed inset-y-0 right-0 z-40 w-full sm:w-[400px] bg-white shadow-2xl transition-transform duration-500 transform border-l border-slate-100 flex flex-col h-full
        lg:translate-x-0 lg:static lg:z-auto lg:rounded-2xl lg:shadow-md lg:shadow-slate-100 lg:w-[360px] lg:h-full lg:max-h-full
        ${showDrawer ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <ShoppingCart className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">TERMINAL BILL</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Ready for Settlement</p>
            </div>
          </div>
          <button onClick={() => setShowDrawer(false)} className="lg:hidden p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 bg-slate-50/20">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-4 py-20 animate-pulse">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                <Package className="w-10 h-10 text-slate-100" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 italic">Bill is Empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <CartItem
                key={`${item.productId}-${item.dailyStockId}`}
                item={item}
                onUpdate={updateCartItem}
                onRemove={removeFromCart}
              />
            ))
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 space-y-4 shrink-0 shadow-[0_-8px_30px_rgb(0,0,0,0.02)]">
          <PaymentModes 
            paymentMode={paymentMode} 
            setPaymentMode={setPaymentMode} 
            totalAmount={totalAmount} 
            setSplitCash={setSplitCash} 
          />
          <SettlementSection
            paymentMode={paymentMode}
            totalAmount={totalAmount}
            subtotal={subtotal}
            cashReceived={cashReceived}
            setCashReceived={setCashReceived}
            discountValue={discountValue}
            setDiscountValue={setDiscountValue}
            splitCash={splitCash}
            setSplitCash={setSplitCash}
            changeAmount={changeAmount}
            splitUPI={splitUPI}
            onKeyDown={handleNumberKeyDown}
          />
          <div className="flex gap-2">
            <button
              disabled={cart.length === 0 || submitting}
              onClick={() => handleCheckout(false)}
              className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30"
            >
              {submitting && !isPrinting ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} />}
              <span>Save</span>
            </button>
            <button
              disabled={cart.length === 0 || submitting}
              onClick={() => handleCheckout(true)}
              className="flex-[1.5] py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30"
            >
              {submitting && isPrinting ? <Loader2 className="animate-spin w-4 h-4" /> : showSuccess ? <CheckCircle className="w-4 h-4" /> : <Printer size={16} />}
              <span>Save & Print</span>
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowDrawer(true)}
        className={`lg:hidden fixed right-6 bottom-28 p-5 bg-blue-600 text-white rounded-2xl shadow-xl z-50 transition-all duration-300 active:scale-90 hover:scale-105 ${showDrawer ? 'scale-0' : 'scale-100'}`}
      >
        <div className="relative">
          <ShoppingCart className="w-6 h-6" />
          {cart.length > 0 && <span className="absolute -top-3 -right-3 w-6 h-6 bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-[3px] border-white">{cart.length}</span>}
        </div>
      </button>

      {showDrawer && (
        <div onClick={() => setShowDrawer(false)} className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 transition-opacity" />
      )}
    </div>
  );
};

export default BillingPage;
