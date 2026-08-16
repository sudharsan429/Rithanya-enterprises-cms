import React, { useState, useEffect, useCallback } from 'react';
import ManagementTable from '../components/ManagementTable';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Loader2, Trash2, Package, IndianRupee, Hash, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const UOM_LIST = [
  { "id": 1, "name": "Piece", "code": "pc" },
  { "id": 2, "name": "Kilogram", "code": "kg" },
  { "id": 3, "name": "Gram", "code": "g" },
  { "id": 4, "name": "Liter", "code": "l" },
  { "id": 5, "name": "Milliliter", "code": "ml" },
  { "id": 6, "name": "Plate", "code": "plate" },
  { "id": 7, "name": "Cup", "code": "cup" },
  { "id": 8, "name": "Bottle", "code": "bottle" },
  { "id": 9, "name": "Pack", "code": "pack" },
  { "id": 10, "name": "Dozen", "code": "dozen" },
  { "id": 11, "name": "Half Dozen", "code": "half_dozen" },
  { "id": 12, "name": "Tray", "code": "tray" },
  { "id": 13, "name": "Bowl", "code": "bowl" },
  { "id": 14, "name": "Glass", "code": "glass" },
  { "id": 15, "name": "Serving", "code": "serving" },
  { "id": 16, "name": "Slice", "code": "slice" },
  { "id": 17, "name": "Packet", "code": "pkt" },
  { "id": 18, "name": "Carton", "code": "carton" },
  { "id": 19, "name": "Tin", "code": "tin" },
  { "id": 20, "name": "Bucket", "code": "bucket" }
];

const ProductsPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    productCode: '',
    category: '', 
    price: '', 
    lowStock: '',
    uom: 'pc' 
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get(`/products?search=${search}&page=${page}`),
        api.get('/categories?limit=100')
      ]);
      
      setProducts(prodRes.data.data || []);
      setTotalPages(prodRes.data.pages || 1);
      setCategories(catRes.data.data || []);
    } catch (_error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Product Name is required';
    if (!formData.productCode.trim()) newErrors.productCode = 'Product Code is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) < 0) {
      newErrors.price = 'Valid non-negative price is required';
    }
    if (formData.lowStock && (isNaN(formData.lowStock) || parseFloat(formData.lowStock) < 0)) {
      newErrors.lowStock = 'Low stock must be a positive number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ name: '', productCode: '', category: '', price: '', lowStock: '', uom: 'pc' });
    setErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setIsEditing(true);
    setSelectedProduct(p);
    setFormData({ 
      name: p.name, 
      productCode: p.productCode || '',
      category: p.category?._id || '', 
      price: p.price, 
      lowStock: p.lowStock || '',
      uom: p.uom 
    });
    setErrors({});
    setShowModal(true);
  };

  const handleNumberOnly = (e) => {
    const charCode = e.which ? e.which : e.keyCode;
    if (charCode === 46) {
      if (e.target.value.includes('.')) e.preventDefault();
    } else if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/products/${selectedProduct._id}`, formData);
        toast.success('Product updated');
      } else {
        await api.post('/products', formData);
        toast.success('Product created');
      }
      setShowModal(false);
      fetchData();
    } catch (_error) {
      toast.error(_error.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/products/${selectedProduct._id}`);
      toast.success('Product removed');
      setShowDeleteModal(false);
      fetchData();
    } catch (_error) {
      toast.error(_error.response?.data?.message || 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { 
      header: 'Product Details', 
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-800 leading-none">{p.name}</p>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[9px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1 border border-slate-100">
                 <Hash className="w-2.5 h-2.5 text-blue-400" />{p.productCode}
               </span>
               <span className="text-[9px] bg-blue-50/50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-blue-100/50">
                 {p.category?.name}
               </span>
            </div>
          </div>
        </div>
      )
    },
    { 
      header: 'Pricing & Alert', 
      render: (p) => (
        <div className="space-y-1">
          <span className="flex items-center gap-1 font-bold text-slate-800 leading-none">
            <IndianRupee className="w-3 h-3 text-blue-500" /> {p.price}
            <span className="text-[9px] text-slate-400 font-medium">/{p.uom}</span>
          </span>
          <p className="text-[9px] text-orange-500 font-bold flex items-center gap-1 uppercase tracking-tighter">
            <AlertTriangle className="w-2.5 h-2.5" /> Low Stock: {p.lowStock || 0}
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <ManagementTable 
        title="Inventory Products" 
        data={products} 
        columns={columns} 
        loading={loading}
        onAdd={['superadmin', 'admin', 'prod_manager'].includes(user?.role) ? handleOpenAdd : undefined}
        onEdit={['superadmin', 'admin', 'prod_manager'].includes(user?.role) ? handleOpenEdit : undefined}
        onDelete={['superadmin', 'admin'].includes(user?.role) ? ((id) => {
          setSelectedProduct(products.find(p => p._id === id));
          setShowDeleteModal(true);
        }) : undefined}
        onSearch={(val) => {
          setSearch(val);
          setPage(1);
        }}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? 'Edit Product' : 'Register New Product'}
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
            <button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-blue-100 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Product'}
            </button>
          </>
        }
      >
        <form className="space-y-6">
          <CustomSelect 
            label="Product Category"
            options={categories.map(c => ({ label: c.name, value: c._id }))}
            value={formData.category}
            onChange={(val) => setFormData({ ...formData, category: val })}
            placeholder="Search categories..."
            error={errors.category}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Product Name</label>
              <input 
                className={`w-full px-5 py-3 bg-white border rounded-xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-100/50 ${errors.name ? 'border-red-400' : 'border-slate-100 focus:border-blue-600'}`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Product name"
              />
              {errors.name && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Product Code</label>
              <input 
                className={`w-full px-5 py-3 bg-white border rounded-xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-100/50 ${errors.productCode ? 'border-red-400' : 'border-slate-100 focus:border-blue-600'}`}
                value={formData.productCode}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                placeholder="Unique code"
              />
              {errors.productCode && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.productCode}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomSelect 
              label="Unit of Measure (UOM)"
              options={UOM_LIST.map(u => ({ label: `${u.name} (${u.code})`, value: u.code }))}
              value={formData.uom}
              onChange={(val) => setFormData({ ...formData, uom: val })}
              placeholder="Search unit..."
            />

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">Price (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text"
                  onKeyPress={handleNumberOnly}
                  className={`w-full pl-11 pr-5 py-3 bg-white border rounded-xl text-sm transition-all focus:outline-none focus:border-blue-600 ${errors.price ? 'border-red-400' : 'border-slate-100'}`}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              {errors.price && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.price}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Low Stock Threshold</label>
            <div className="relative">
              <AlertTriangle className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <input 
                type="text"
                onKeyPress={handleNumberOnly}
                className={`w-full pl-11 pr-5 py-3 bg-white border rounded-xl text-sm transition-all focus:outline-none focus:border-blue-600 ${errors.lowStock ? 'border-red-400' : 'border-slate-100'}`}
                value={formData.lowStock}
                onChange={(e) => setFormData({ ...formData, lowStock: e.target.value })}
                placeholder="Target alert level (e.g. 5)"
              />
            </div>
            {errors.lowStock && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.lowStock}</p>}
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remove Product"
        maxWidth="max-w-sm"
        footer={
          <>
            <button onClick={() => setShowDeleteModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
            <button onClick={handleDelete} disabled={submitting} className="bg-red-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-red-100 active:scale-95 transition-all">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Delete'}
            </button>
          </>
        }
      >
        <div className="text-center p-2 space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto"><Trash2 className="w-8 h-8" /></div>
          <p className="text-sm text-slate-500">Are you sure you want to remove <span className="text-slate-900 font-bold">{selectedProduct?.name}</span>? This will affect historical statistics.</p>
        </div>
      </Modal>
    </div>
  );
};

export default ProductsPage;
