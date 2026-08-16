import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell, Search, User as UserIcon, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Modal from './Modal';

const Layout = () => {
  const { user, logout } = useAuth();
  const [datetime, setDatetime] = React.useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = React.useState(false);
  const [passwords, setPasswords] = React.useState({ newPassword: '', confirmPassword: '' });
  const [changeLoading, setChangeLoading] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    const timer = setInterval(() => setDatetime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    setShowProfileMenu(false);
  }, [location.pathname]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    
    setChangeLoading(true);
    try {
      await api.put('/auth/change-password', {
        newPassword: passwords.newPassword
      });
      toast.success('Password updated successfully');
      setIsChangePasswordModalOpen(false);
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setChangeLoading(false);
    }
  };

  const formatDateTime = (date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    const h = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
    const min = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${d}/${m}/${y} ${h}:${min}:${s} ${date.getHours() >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <>
      <div className="flex h-screen bg-white font-normal overflow-hidden">
        <Sidebar className="shrink-0 h-full" />
        
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 transition-all shadow-sm shadow-slate-100/20 backdrop-blur-md">
            {/* Real-time Clock replaces Search */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-blue-50/50 rounded-xl border border-blue-100/50 group hover:bg-blue-50 transition-all cursor-default">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] hidden sm:block">System Time</span>
              <div className="w-px h-3 bg-blue-100 hidden sm:block"></div>
              <span className="text-xs font-black text-blue-600 font-mono tracking-widest tabular-nums italic">
                {formatDateTime(datetime)}
              </span>
            </div>

            <div className="flex items-center gap-2 lg:gap-6">
              <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors hidden sm:block">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              
              <div className="h-8 w-px bg-slate-100 hidden sm:block"></div>
              
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 max-w-[200px]"
                >
                  <div className="text-right hidden md:block px-2 min-w-0">
                    <p className="font-bold text-slate-800 text-[11px] uppercase tracking-tight leading-none truncate">{user?.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate">{user?.role}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 shrink-0 group">
                    <UserIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowProfileMenu(false)}></div>
                    <div className="absolute right-0 mt-3 w-52 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                      <div className="px-5 py-4 border-b border-slate-50 mb-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account</p>
                        <p className="text-sm font-bold text-slate-800 truncate mt-1">{user?.email}</p>
                      </div>

                      {user?.role !== 'salesperson' && (
                        <button 
                          onClick={() => {
                            setIsChangePasswordModalOpen(true);
                            setShowProfileMenu(false);
                          }}
                          className="w-full text-left block px-5 py-2.5 text-[11px] text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-colors font-bold uppercase tracking-widest"
                        >
                          Change Password
                        </button>
                      )}
                    
                      <div className="h-px bg-slate-50 my-1"></div>
                      <button 
                        onClick={logout}
                        className="w-full text-left block px-5 py-2.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50/50 transition-colors font-bold"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>
          
          <main className="flex-1 p-6 overflow-y-auto bg-[#F8FAFC]">
            <div className="max-w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      
      <Modal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        title="Update Account Password"
        maxWidth="max-w-md"
        footer={(
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setIsChangePasswordModalOpen(false)}
              className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
            >
              Discard
            </button>
            <button
              onClick={handleChangePassword}
              disabled={changeLoading || !passwords.newPassword || !passwords.confirmPassword}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
            >
              {changeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Changes'}
            </button>
          </div>
        )}
      >
        <div className="space-y-6">
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-4">
            <Lock className="w-6 h-6 text-amber-600 shrink-0" />
            <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-tight">
              Security Notice: Choose a strong password. You will be logged out upon successful update.
            </p>
          </div>

          <div className="space-y-4">

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
              <input
                type="password"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all text-sm font-bold"
                placeholder="••••••••"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
              <input
                type="password"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all text-sm font-bold"
                placeholder="••••••••"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );

};

export default Layout;
