import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Layers,
  Warehouse,
  Store,
  Package,
  FileText,
  ClipboardList,
  ArrowRightLeft,
  CheckSquare,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();

  const menuItems = [
    { title: 'Dashboard', icon: BarChart3, path: '/dashboard', roles: ['superadmin', 'admin', 'prod_manager', 'salesperson'] },
    { title: 'Production Units', icon: Warehouse, path: '/production-units', roles: ['superadmin', 'admin'] },
    { title: 'Canteens', icon: Store, path: '/canteens', roles: ['superadmin', 'admin'] },
    { title: 'Users', icon: Users, path: '/users', roles: ['superadmin', 'admin'] },
    { title: 'Categories', icon: Layers, path: '/categories', roles: ['superadmin', 'admin', 'prod_manager'] },
    { title: 'Products', icon: Package, path: '/products', roles: ['superadmin', 'admin', 'prod_manager', 'salesperson'] },
    { title: 'Daily Stock', icon: ClipboardList, path: '/daily-stock', roles: ['superadmin', 'admin', 'prod_manager'] },
    { title: 'Transfers', icon: ArrowRightLeft, path: '/transfers', roles: ['superadmin', 'admin', 'prod_manager', 'salesperson'] },
    { title: 'Accept Transfers', icon: CheckSquare, path: '/accept-transfers', roles: ['superadmin', 'admin', 'prod_manager', 'salesperson'] },
    { title: 'Billing', icon: Receipt, path: '/billing', roles: ['superadmin', 'admin', 'salesperson'] },
    { title: 'Returns', icon: RotateCcw, path: '/returns', roles: ['superadmin', 'admin', 'salesperson', 'prod_manager'] },
    { title: 'Reports', icon: FileText, path: '/reports', roles: ['superadmin', 'admin', 'prod_manager', 'salesperson'] },
  ];

  const filteredItems = menuItems.filter(item => user?.role === 'superadmin' || item.roles.includes(user?.role));

  return (
    <aside className="w-20 lg:w-64 bg-white border-r border-slate-100 flex flex-col h-full sticky top-0 z-40 transition-all duration-300 font-normal">
      <div className="h-16 px-8 border-b border-slate-100 flex items-center justify-between lg:justify-start overflow-hidden bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 shrink-0">
            <Warehouse className="w-6 h-6 text-white" />
          </div>
          <div className="hidden lg:block truncate">
            <h2 className="text-sm font-black text-slate-800 tracking-tighter uppercase leading-none">Rithanya</h2>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em] mt-1 opacity-80">Enterprises</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 lg:p-4 space-y-1 overflow-y-auto scrollbar-hide">
        {filteredItems.map((item) => (
          <div key={item.path} className="group relative">
            <NavLink
              to={item.path}
              className={({ isActive }) => `
                flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-2 py-2 lg:py-2 rounded-xl lg:rounded-2xl transition-all duration-200 border
                ${isActive
                  ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100/50 font-bold border-blue-100/50'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600 font-bold border-transparent'}
              `}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block text-[10px] uppercase tracking-widest truncate">{item.title}</span>
            </NavLink>

            {/* High-End Tooltip (Visual Reference matching step 1155) */}
            <div className="absolute left-full ml-4 px-3.5 py-2 bg-slate-900/95 backdrop-blur-md text-white text-[11px] font-bold rounded-xl opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap z-100 shadow-2xl lg:hidden flex items-center ring-1 ring-white/10">
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-slate-900/95" />
              {item.title}
            </div>
          </div>
        ))}
      </nav>


    </aside>
  );
};

export default Sidebar;
