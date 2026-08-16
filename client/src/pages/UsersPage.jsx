import React, { useState, useEffect, useCallback } from 'react';
import ManagementTable from '../components/ManagementTable';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import api from '../api/axios';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  UserCircle, 
  Loader2,
  Trash2,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const UsersPage = () => {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [canteens, setCanteens] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    role: 'salesperson',
    assignedCanteen: '',
    assignedProductionUnit: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, canteensRes, unitsRes] = await Promise.all([
        api.get(`/users?search=${search}&page=${page}`),
        api.get('/canteens?limit=100'), 
        api.get('/production-units?limit=100')
      ]);
      setUsers(usersRes.data.data);
      setTotalPages(usersRes.data.pages);
      setCanteens(canteensRes.data.data || []);
      setUnits(unitsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch data', error);
      toast.error('Failed to load system data');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email address';
    
    if (formData.role === 'salesperson' && !formData.assignedCanteen) {
      newErrors.assignedCanteen = 'Canteen assignment required for salesperson';
    }
    if (formData.role === 'prod_manager' && !formData.assignedProductionUnit) {
      newErrors.assignedProductionUnit = 'Production unit assignment required for manager';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setFormData({ 
      name: '', 
      email: '', 
      role: authUser.role === 'prod_manager' ? 'salesperson' : (authUser.role === 'admin' ? 'prod_manager' : 'admin'), 
      assignedCanteen: '',
      assignedProductionUnit: ''
    });
    setErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (u) => {
    setIsEditing(true);
    setSelectedUser(u);
    setFormData({ 
      name: u.name, 
      email: u.email, 
      role: u.role,
      assignedCanteen: u.assignedCanteen?._id || '',
      assignedProductionUnit: u.assignedProductionUnit?._id || ''
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/users/${selectedUser._id}`, formData);
        toast.success('User updated successfully');
      } else {
        await api.post('/auth/register', formData);
        toast.success('User created. credentials emailed.');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/users/${selectedUser._id}`);
      toast.success('User removed from system');
      setShowDeleteModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminReset = async (u) => {
    if (!window.confirm(`Are you sure you want to reset the password for ${u.name}? A new password will be generated and emailed to them.`)) return;
    
    const loadingToast = toast.loading('Resetting password...');
    try {
      const { data } = await api.post(`/auth/admin-reset/${u._id}`);
      toast.success(data.message || 'Password reset successful', { id: loadingToast });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reset failed', { id: loadingToast });
    }
  };

  const columns = [
    { 
      header: 'User Details', 
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-900 leading-none">{u.name}</p>
              {u.resetRequested && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-tighter rounded border border-amber-200 animate-pulse">
                  Reset Requested
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium italic"><Mail className="w-2.5 h-2.5" />{u.email}</p>
          </div>
        </div>
      )
    },
    { 
      header: 'Role', 
      render: (u) => (
        <span className={`px-4 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 w-fit ${
          u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' :
          u.role === 'prod_manager' ? 'bg-orange-50 text-orange-600' :
          'bg-emerald-50 text-emerald-600'
        }`}>
          {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserCircle className="w-3 h-3" />}
          {u.role.replace('_', ' ')}
        </span>
      )
    },
    { 
      header: 'Assignment', 
      render: (u) => (
        <span className="text-slate-400 text-xs font-bold font-medium italic">
          {u.assignedCanteen?.name || u.assignedProductionUnit?.name || 'Unassigned'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <ManagementTable 
        title="User Management" 
        data={users} 
        columns={columns} 
        loading={loading}
        onAdd={['superadmin', 'admin', 'prod_manager'].includes(authUser?.role) ? handleOpenAdd : undefined}
        onEdit={['superadmin', 'admin'].includes(authUser?.role) ? handleOpenEdit : undefined}
        onDelete={['superadmin', 'admin'].includes(authUser?.role) ? ((id) => {
          setSelectedUser(users.find(u => u._id === id));
          setShowDeleteModal(true);
        }) : undefined}
        onSearch={(val) => {
          setSearch(val);
          setPage(1);
        }}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        renderActions={(u) => (authUser.role === 'admin' || authUser.role === 'superadmin') && (
          <button 
            onClick={() => handleAdminReset(u)}
            className={`p-2 rounded-lg transition-all ${u.resetRequested ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
            title="Reset Password"
          >
            <RotateCcw className={`w-4 h-4 ${u.resetRequested ? 'animate-spin-slow' : ''}`} />
          </button>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? 'Edit User Profile' : 'Register New User'}
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-blue-100 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Create Account')}
            </button>
          </>
        }
      >
        <form className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Full Name</label>
            <input 
              className={`w-full px-5 py-3 bg-slate-50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-slate-900/5 ${errors.name ? 'border-red-400 bg-red-50/20' : 'border-slate-100 focus:border-slate-900'}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. John Doe"
            />
            {errors.name && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Email Address</label>
            <input 
              className={`w-full px-5 py-3 bg-slate-50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-slate-900/5 ${errors.email ? 'border-red-400 bg-red-50/20' : 'border-slate-100 focus:border-slate-900'}`}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isEditing}
              placeholder="e.g. john@example.com"
            />
            {errors.email && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">System Role</label>
            <CustomSelect
              options={[
                ...(authUser.role === 'superadmin' ? [
                  { label: 'Administrator', value: 'admin' },
                  { label: 'Production Manager', value: 'prod_manager' }
                ] : []),
                ...(authUser.role === 'admin' ? [{ label: 'Production Manager', value: 'prod_manager' }] : []),
                { label: 'Salesperson', value: 'salesperson' }
              ]}
              value={formData.role}
              onChange={(val) => setFormData({ ...formData, role: val, assignedCanteen: '', assignedProductionUnit: '' })}
              isClearable={false}
            />
          </div>

          {formData.role === 'salesperson' && (
            <CustomSelect 
              label="Assign Canteen"
              options={canteens.map(c => ({ label: c.name, value: c._id }))}
              value={formData.assignedCanteen}
              onChange={(val) => setFormData({ ...formData, assignedCanteen: val })}
              placeholder="Search and select canteen..."
              error={errors.assignedCanteen}
            />
          )}

          {formData.role === 'prod_manager' && (
            <CustomSelect 
              label="Assign Production Unit"
              options={units.map(u => ({ label: u.name, value: u._id }))}
              value={formData.assignedProductionUnit}
              onChange={(val) => setFormData({ ...formData, assignedProductionUnit: val })}
              placeholder="Search and select production unit..."
              error={errors.assignedProductionUnit}
            />
          )}
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remove User Account"
        maxWidth="max-w-sm"
        footer={
          <>
            <button onClick={() => setShowDeleteModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
            <button onClick={handleDelete} disabled={submitting} className="bg-red-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-red-100 active:scale-95 transition-all">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Delete'}
            </button>
          </>
        }
      >
        <div className="text-center p-2 space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto"><Trash2 className="w-8 h-8" /></div>
          <p className="text-sm text-slate-500">Are you sure you want to remove <span className="text-slate-900 font-bold font-medium">{selectedUser?.name}</span>? This action is irreversible.</p>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
