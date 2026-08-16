import React, { useState, useEffect, useCallback } from 'react';
import ManagementTable from '../components/ManagementTable';
import Modal from '../components/Modal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Loader2, Trash2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

const CategoriesPage = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Search State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/categories?search=${search}&page=${page}`);
      setCategories(res.data.data || []);
      setTotalPages(res.data.pages || 1);
    } catch (_error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Category Name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ name: '', description: '' });
    setErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (cat) => {
    setIsEditing(true);
    setSelectedCategory(cat);
    setFormData({ name: cat.name, description: cat.description || '' });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/categories/${selectedCategory._id}`, formData);
        toast.success('Category updated');
      } else {
        await api.post('/categories', formData);
        toast.success('Category created');
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
      await api.delete(`/categories/${selectedCategory._id}`);
      toast.success('Category removed');
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
      header: 'Category', 
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <Tag className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-800">{c.name}</span>
        </div>
      )
    },
    { header: 'Description', key: 'description' }
  ];

  return (
    <div className="space-y-6">
      <ManagementTable 
        title="Product Categories" 
        data={categories} 
        columns={columns} 
        loading={loading}
        onAdd={['superadmin', 'admin', 'prod_manager'].includes(user?.role) ? handleOpenAdd : undefined}
        onEdit={['superadmin', 'admin', 'prod_manager'].includes(user?.role) ? handleOpenEdit : undefined}
        onDelete={['superadmin', 'admin'].includes(user?.role) ? ((id) => {
          setSelectedCategory(categories.find(c => c._id === id));
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
        title={isEditing ? 'Edit Category' : 'Add New Category'}
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
            <button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-blue-100 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Category'}
            </button>
          </>
        }
      >
        <form className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Category Name</label>
            <input 
              className={`w-full px-5 py-3 bg-white border rounded-2xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-100/50 ${errors.name ? 'border-red-400' : 'border-slate-100 focus:border-blue-600'}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Beverages"
            />
            {errors.name && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Description (Optional)</label>
            <textarea 
              rows="3"
              className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm transition-all focus:outline-none focus:border-slate-900"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of category items..."
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Category"
        maxWidth="max-w-sm"
        footer={
          <>
            <button onClick={() => setShowDeleteModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
            <button onClick={handleDelete} disabled={submitting} className="bg-red-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </button>
          </>
        }
      >
        <div className="text-center p-2 space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto"><Trash2 className="w-8 h-8" /></div>
          <p className="text-sm text-slate-500">Are you sure you want to delete <span className="text-slate-900 font-bold">{selectedCategory?.name}</span>? This may affect products using this category.</p>
        </div>
      </Modal>
    </div>
  );
};

export default CategoriesPage;
