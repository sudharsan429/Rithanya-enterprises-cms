import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Wallet, 
  Box, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  ArrowRight
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    if (socket) {
      const events = ['SALE_CREATED', 'STOCK_UPDATED', 'TRANSFER_COMPLETED'];
      events.forEach(ev => socket.on(ev, fetchStats));
      return () => events.forEach(ev => socket.off(ev, fetchStats));
    }
  }, [socket, fetchStats]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isManager = user?.role === 'prod_manager';
  const isSales = user?.role === 'salesperson';

  // --- Role Specific Data Preparations ---

  // A. ADMIN DATA
  const adminTrendData = {
    labels: stats.charts?.last30DaysTrend?.map(d => d._id) || [],
    datasets: [
      {
        label: 'Revenue',
        data: stats.charts?.last30DaysTrend?.map(d => d.revenue) || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Sales Count',
        data: stats.charts?.last30DaysTrend?.map(d => d.sales) || [],
        borderColor: '#10b981',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const adminStockTrendData = {
    labels: stats.charts?.puStockHistory?.map(d => d._id) || [],
    datasets: [{
      label: 'Historical PU Stock',
      data: stats.charts?.puStockHistory?.map(d => d.totalStock) || [],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  };

  const adminCanteenSalesData = {
    labels: stats.charts?.canteenTodayStats?.map(c => c.name) || [],
    datasets: [{
      label: 'Today Orders',
      data: stats.charts?.canteenTodayStats?.map(c => c.sales) || [],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  };

  const adminCanteenRevenueData = {
    labels: stats.charts?.canteenTodayStats?.map(c => c.name) || [],
    datasets: [{
      label: 'Today Revenue',
      data: stats.charts?.canteenTodayStats?.map(c => c.revenue) || [],
      backgroundColor: '#f59e0b',
      borderRadius: 8,
    }]
  };

  const adminCanteenStockData = {
    labels: stats.charts?.stockByCanteen?.map(c => c.name) || [],
    datasets: [{
      label: 'Current Stock',
      data: stats.charts?.stockByCanteen?.map(c => c.total) || [],
      backgroundColor: '#6366f1',
      borderRadius: 8,
    }]
  };

  // B. MANAGER DATA
  const managerTrendData = {
    labels: stats.charts?.transferTrend?.map(d => d._id) || [],
    datasets: [
      {
        label: 'Transfer Value',
        data: stats.charts?.transferTrend?.map(d => d.revenue) || [],
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Transfer Count',
        data: stats.charts?.transferTrend?.map(d => d.sales) || [],
        borderColor: '#6366f1',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const managerTodaySales = {
    labels: stats.charts?.todayTrend?.map(d => `${d._id}:00`) || [],
    datasets: [{
      label: 'Today Transfers',
      data: stats.charts?.todayTrend?.map(d => d.sales) || [],
      borderColor: '#ec4899',
      backgroundColor: 'rgba(236, 72, 153, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  };

  const managerTodayRevenue = {
    labels: stats.charts?.todayTrend?.map(d => `${d._id}:00`) || [],
    datasets: [{
      label: 'Transfer Valuation',
      data: stats.charts?.todayTrend?.map(d => d.revenue) || [],
      backgroundColor: '#10b981',
      borderRadius: 8,
    }]
  };

  // C. SALESPERSON DATA
  const salespersonTrendData = {
    labels: stats.charts?.last30DaysTrend?.map(d => d._id) || [],
    datasets: [
      {
        label: 'Revenue',
        data: stats.charts?.last30DaysTrend?.map(d => d.revenue) || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Sales Count',
        data: stats.charts?.last30DaysTrend?.map(d => d.sales) || [],
        borderColor: '#10b981',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const salesTodayTrend = {
    labels: stats.charts?.todayTrend?.map(d => `${d._id}:00`) || [],
    datasets: [{
      label: 'Orders',
      data: stats.charts?.todayTrend?.map(d => d.sales) || [],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  };

  const revenueTodayTrend = {
    labels: stats.charts?.todayTrend?.map(d => `${d._id}:00`) || [],
    datasets: [{
      label: 'Today Revenue',
      data: stats.charts?.todayTrend?.map(d => d.revenue) || [],
      backgroundColor: '#f59e0b',
      borderRadius: 8,
    }]
  };

  // Common Product Stock Level
  const stockLevelsData = {
    labels: stats.charts?.stockLevels?.map(s => s.name) || [],
    datasets: [{
      label: 'Quantity',
      data: stats.charts?.stockLevels?.map(s => s.total) || [],
      backgroundColor: '#6366f1',
      borderRadius: 8,
    }]
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-1">
             <Clock className="w-4 h-4 text-blue-500" />
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               Welcome back, <span className="text-blue-600 font-bold">{user?.name}</span> • Role: <span className="text-slate-600 font-bold">{user?.role}</span>
             </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        <StatCard 
          title="Today Activity" 
          value={stats.todaySale} 
          subValue={isAdmin ? "Orders across all units" : isManager ? "Transfers Issued" : "My Orders"}
          icon={ShoppingBag}
          trend="+12%"
          color="blue"
        />
        <StatCard 
          title="Today Revenue" 
          value={`₹${stats.todayRevenue?.toLocaleString()}`} 
          subValue="Real-time intake (3am+)"
          icon={Wallet}
          trend="+5.4%"
          color="amber"
        />
        <StatCard 
          title="Current Stock" 
          value={stats.todayStock?.toLocaleString()} 
          subValue="Available Units"
          icon={Box}
          trend="-2.1%"
          color="slate"
        />
        
        {!isSales && (
          <>
            <StatCard 
              title="Overall Activity" 
              value={stats.overallSale?.toLocaleString()} 
              subValue="Lifetime volume"
              icon={TrendingUp}
              trend="+8.2%"
              color="blue"
            />
            <StatCard 
              title="Overall Value" 
              value={`₹${stats.overallRevenue?.toLocaleString()}`} 
              subValue="Cumulative Intake"
              icon={Wallet}
              trend="+4.1%"
              color="amber"
            />
            <StatCard 
              title="Global Holding" 
              value={stats.overallStock?.toLocaleString()} 
              subValue="Total Asset Count"
              icon={Box}
              trend="+0.5%"
              color="slate"
            />
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Chart 1: Sales / Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" /> 
                    {isAdmin ? "Global 30-Day Trend" : isManager ? "Today Transfers Trend" : "Hourly Sales Activity"}
                 </h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Linear Momentum</p>
              </div>
           </div>
           <div className="h-[350px]">
             <Line 
               data={isAdmin ? adminTrendData : isManager ? managerTodaySales : salesTodayTrend}
               options={{
                 responsive: true,
                 maintainAspectRatio: false,
                 scales: {
                   y: { 
                      beginAtZero: true, 
                      grid: { color: 'rgba(0,0,0,0.03)' },
                      ticks: { font: { size: 10, weight: 'bold' } }
                   },
                   y1: isAdmin ? {
                      position: 'right',
                      grid: { display: false },
                      ticks: { font: { size: 10, weight: 'bold' } }
                   } : { display: false },
                   x: { 
                      grid: { display: false },
                      ticks: { font: { size: 10, weight: 'bold' } }
                   }
                 },
                 plugins: { 
                    legend: { 
                      display: true,
                      position: 'bottom',
                      labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } }
                    } 
                 }
               }} 
             />
           </div>
        </div>

        {/* Chart 2: Revenue Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-500" /> 
                    {isAdmin ? "Today Canteen Revenue" : isManager ? "Today Transfer Value" : "Hourly Intake Distribution"}
                 </h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Revenue Distribution</p>
              </div>
           </div>
           <div className="h-[350px]">
             <Bar 
               data={isAdmin ? adminCanteenRevenueData : isManager ? managerTodayRevenue : revenueTodayTrend}
               options={{
                 responsive: true,
                 maintainAspectRatio: false,
                 scales: {
                   y: { 
                      beginAtZero: true, 
                      grid: { color: 'rgba(0,0,0,0.03)' },
                      ticks: { font: { size: 10, weight: 'bold' } }
                   },
                   x: { 
                      grid: { display: false },
                      ticks: { font: { size: 10, weight: 'bold' } }
                   }
                 },
                 plugins: { legend: { display: false } }
               }} 
             />
           </div>
        </div>

        {/* Chart 3: Stock Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <Box className="w-4 h-4 text-slate-500" /> 
                    {isAdmin ? "Today Canteen Stock" : "Product Inventory Levels"}
                 </h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Resource Distribution</p>
              </div>
           </div>
           <div className="h-[350px]">
             <Bar 
               data={isAdmin ? adminCanteenStockData : stockLevelsData}
               options={{
                 responsive: true,
                 maintainAspectRatio: false,
                 scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' } },
                    x: { grid: { display: false } }
                 },
                 plugins: { legend: { display: false } }
               }} 
             />
           </div>
        </div>

        {/* Chart 4: Secondary / Long Term Trends */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" /> 
                    {isAdmin ? "30-Day PU Stock History" : isManager ? "30-Day Transfer Performance" : "My 30-Day Growth Pulse"}
                 </h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Historical Pulse</p>
              </div>
           </div>
           <div className="h-[350px]">
             <Line 
               data={isAdmin ? adminStockTrendData : isManager ? managerTrendData : salespersonTrendData}
               options={{
                 responsive: true,
                 maintainAspectRatio: false,
                 scales: {
                   y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' } },
                   y1: (!isSales && !isAdmin) ? { position: 'right', grid: { display: false } } : { display: false },
                   x: { grid: { display: false } }
                 },
                 plugins: { legend: { display: true, position: 'bottom' } }
               }} 
             />
           </div>
        </div>

        {/* Extra Charts for Admin */}
        {isAdmin && (
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" /> Today Canteen Sales Momentum
                 </h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Regional Sales Linear Split</p>
              </div>
           </div>
           <div className="h-[350px]">
             <Line 
               data={adminCanteenSalesData}
               options={{
                 responsive: true,
                 maintainAspectRatio: false,
                 scales: {
                   y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' } },
                   x: { grid: { display: false } }
                 },
                 plugins: { legend: { display: false } }
               }} 
             />
           </div>
        </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subValue, icon: Icon, trend, color }) => {
  const isUp = trend?.startsWith('+');
  const baseColor = color === 'blue' ? 'blue' : color === 'amber' ? 'amber' : 'slate';
  
  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group transition-all relative overflow-hidden`}>
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
             <div className={`w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-${baseColor}-600 border border-slate-100`}>
                <Icon className="w-4 h-4" />
             </div>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-80">{subValue}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${isUp ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
           {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
           <span className="text-[10px] font-bold uppercase tracking-widest">{trend}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
