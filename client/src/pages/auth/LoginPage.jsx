import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Mail, Lock, Loader2, UtensilsCrossed, Eye, EyeOff } from 'lucide-react';
import Modal from '../../components/Modal';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [datetime, setDatetime] = useState(new Date());

  // Forgot Password States
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
// ... (omitted formats)
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success(data.message || 'Action completed');
      setIsForgotModalOpen(false);
      setForgotEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setForgotLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setDatetime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data, data.token);
      toast.success(`Welcome back, ${data.name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex bg-slate-50 font-sans overflow-hidden select-none">
      <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">

        {/* LEFT PANEL: Branding (Visible from Tablet Upwards) */}
        <div className="hidden md:flex w-1/2 bg-primary flex-col justify-between p-10 md:p-12 lg:p-20 relative overflow-hidden shrink-0 border-r border-slate-100 min-h-[40vh] lg:min-h-0 text-white animate-in slide-in-from-left-20 duration-1000">
          {/* High-Fidelity Background Elements */}
          <div className="absolute inset-0 bg-linear-to-br from-blue-700 via-blue-800 to-blue-900 opacity-90" />
          <div className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[140px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]"></div>

          {/* TOP SECTION: Clock & Status */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-8 duration-1000">
            <div className="inline-flex flex-col gap-2 p-5 bg-white backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Operational Status: Active</span>
              </div>
              <div className= "text-primary text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter font-mono italic tabular-nums leading-none">
                {formatTime(datetime)}
              </div>
              <div className="text-primary font-bold uppercase tracking-[0.2em] text-[9px] flex items-center gap-2">
                <span className="w-6 h-px bg-white/10"></span>
                {formatDate(datetime)}
              </div>
            </div>

            <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/10 group hover:bg-white/10 transition-all duration-500">
              <UtensilsCrossed className="text-white w-7 h-7 lg:w-8 lg:h-8 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
            </div>
          </div>

          {/* BOTTOM SECTION: Branding */}
          <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1200">
            <div className="space-y-0">
              <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter leading-none italic select-none">
                RITHANYA
              </h1>
              <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white tracking-tighter leading-none italic select-none opacity-90">
                ENTERPRISES
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="h-px w-12 bg-blue-500/50"></div>
              <p className="text-white/60 text-sm md:text-base font-bold uppercase tracking-[0.4em] italic">
                Simple &bull; Clean &bull; Professional
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Login Form (Adaptive Centering & Safe Scroll) */}
        <div className="flex-1 bg-linear-to-b from-slate-50 via-slate-50 to-blue-50/30 flex flex-col items-center p-6 md:p-12 lg:p-16 relative overflow-y-auto h-full scrollbar-none [scrollbar-width:none]">
          {/* Subtle Mobile Background Element */}
          <div className="lg:hidden absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-100/10 rounded-full blur-[80px]"></div>
          <div className="lg:hidden absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-indigo-100/10 rounded-full blur-[80px]"></div>
          
          <div className="w-full max-w-[380px] my-auto py-10 lg:py-0 animate-in fade-in slide-in-from-right-8 duration-700 relative z-20">

            {/* Mobile Header (Safe Area Aware) */}
            <div className="md:hidden mb-8 flex items-center justify-between w-full pt-[env(safe-area-inset-top,1.5rem)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 flex items-center justify-center rounded-xl shadow-lg border border-blue-500/20">
                  <UtensilsCrossed className="text-white w-5 h-5" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tighter italic">RITHANYA</h2>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-blue-600 tracking-tighter font-mono italic tabular-nums leading-none">
                  {formatTime(datetime)}
                </div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  System Status: Active
                </div>
              </div>
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2 italic">Welcome</h2>
              <p className="text-slate-500 text-sm font-medium italic uppercase tracking-widest opacity-60">Authorize your session</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest mb-8 border border-red-100 flex items-center gap-3 animate-in shake duration-500">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-1">Account Email</label>
                <div className="relative group">
                  <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-blue-600 group-focus-within:text-blue-600 transition-colors w-4.5 h-4.5" />
                  <input
                    type="email"
                    required
                    className="w-full pl-8 pr-4 py-3 bg-transparent  border-b-2 border-blue-600 focus:border-blue-600 focus:outline-none transition-all text-slate-800 font-bold placeholder:text-slate-200 text-sm italic"
                    placeholder="mail@rithanya.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-blue-600 group-focus-within:text-blue-600 transition-colors w-4.5 h-4.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full pl-8 pr-12 py-3 bg-transparent border-b-2 border-blue-600 focus:border-blue-600 focus:outline-none transition-all text-slate-800 font-bold placeholder:text-slate-200 text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button 
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-700 transition-all hover:underline"
                >
                  Recover Password
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4.5 rounded-xl font-extrabold text-[11px] shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-3 transform active:scale-[0.98] uppercase tracking-[0.4em] mt-10"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                  <>
                    Sign In <LogIn className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-center gap-6">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic opacity-50">
                &copy; {new Date().getFullYear()} RITHANYA ENTERPRISES
              </p>
             
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Recover Password"
        maxWidth="max-w-md"
        footer={(
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setIsForgotModalOpen(false)}
              className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleForgotPassword}
              disabled={forgotLoading || !forgotEmail}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
            >
              {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Request'}
            </button>
          </div>
        )}
      >
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-4">
            <Mail className="w-6 h-6 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700 font-bold leading-relaxed uppercase tracking-tight">
              Enter your account email below. Admins will receive a reset link directly. Managers and Sales Personnel requests will be sent to the Administrator for approval.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Registered Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors w-4.5 h-4.5" />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all text-slate-800 font-bold placeholder:text-slate-300 text-sm"
                placeholder="email@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LoginPage;
