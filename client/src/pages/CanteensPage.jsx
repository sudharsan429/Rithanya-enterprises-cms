import React, { useState, useEffect, useCallback } from 'react';
import ManagementTable from '../components/ManagementTable';
import Modal from '../components/Modal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Loader2, Trash2, AlertCircle, Store } from 'lucide-react';
import toast from 'react-hot-toast';

const CanteensPage = () => {
  const { user } = useAuth();
  const [canteens, setCanteens] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Search State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCanteen, setSelectedCanteen] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', location: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchCanteens = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/canteens?search=${search}&page=${page}`);
      setCanteens(data.data);
      setTotalPages(data.pages);
    } catch (error) {
      console.error('Failed to fetch canteens', error);
      toast.error('Failed to load canteens');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchCanteens();
  }, [fetchCanteens]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Canteen Name is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ name: '', location: '' });
    setErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (canteen) => {
    setIsEditing(true);
    setSelectedCanteen(canteen);
    setFormData({ name: canteen.name, location: canteen.location });
    setErrors({});
    setShowModal(true);
  };

  const handleOpenDelete = (canteen) => {
    setSelectedCanteen(canteen);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/canteens/${selectedCanteen._id}`, formData);
        toast.success('Canteen updated successfully');
      } else {
        await api.post('/canteens', formData);
        toast.success('Canteen created successfully');
      }
      setShowModal(false);
      fetchCanteens();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/canteens/${selectedCanteen._id}`);
      toast.success('Canteen deleted');
      setShowDeleteModal(false);
      fetchCanteens();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete canteen');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { header: 'Canteen Name', key: 'name' },
    { header: 'Location', key: 'location' }
  ];

  return (
    <div className="space-y-6">
      <ManagementTable 
        title="Canteens" 
        data={canteens} 
        columns={columns} 
        loading={loading}
        onAdd={['superadmin', 'admin'].includes(user?.role) ? handleOpenAdd : undefined}
        onEdit={['superadmin', 'admin'].includes(user?.role) ? handleOpenEdit : undefined}
        onDelete={['superadmin', 'admin'].includes(user?.role) ? ((id) => handleOpenDelete(canteens.find(c => c._id === id))) : undefined}
        onSearch={(val) => {
          setSearch(val);
          setPage(1);
        }}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? 'Edit Canteen' : 'Add New Canteen'}
        footer={
          <>
            <button 
              onClick={() => setShowModal(false)}
              className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? 'Update Canteen' : 'Create Canteen')}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Canteen Name</label>
            <input 
              type="text"
              placeholder="e.g. Main Canteen A"
              className={`w-full px-5 py-3 rounded-xl bg-white border transition-all focus:outline-none focus:ring-4 focus:ring-blue-100/50 ${errors.name ? 'border-red-400' : 'border-slate-100 focus:border-blue-600'}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {errors.name && <p className="text-red-500 text-[10px] font-bold uppercase tracking-tight ml-1 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" /> {errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Physical Location</label>
            <input 
              type="text"
              placeholder="e.g. North Sector, Zone 1"
              className={`w-full px-5 py-3 rounded-xl bg-white border transition-all focus:outline-none focus:ring-4 focus:ring-blue-100/50 ${errors.location ? 'border-red-400' : 'border-slate-100 focus:border-blue-600'}`}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            {errors.location && <p className="text-red-500 text-[10px] font-bold uppercase tracking-tight ml-1 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" /> {errors.location}</p>}
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Deletion"
        maxWidth="max-w-sm"
        footer={
          <>
            <button 
              onClick={() => setShowDeleteModal(false)}
              className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button 
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-red-100 flex items-center gap-2 active:scale-95 transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Permanently'}
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <p className="font-bold text-slate-800">Delete Canteen?</p>
            <p className="text-sm text-slate-400 px-4">Are you sure you want to remove <span className="text-slate-900 font-bold">{selectedCanteen?.name}</span>? This cannot be undone.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CanteensPage;
