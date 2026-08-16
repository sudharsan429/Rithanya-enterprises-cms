import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'
import Dashboard from './pages/Dashboard'
import UsersPage from './pages/UsersPage'
import CategoriesPage from './pages/CategoriesPage'
import ProductsPage from './pages/ProductsPage'
import ProductionUnitsPage from './pages/ProductionUnitsPage'
import CanteensPage from './pages/CanteensPage'
import ReportsPage from './pages/reports/ReportsPage'
import DailyStockListPage from './pages/daily-stock/DailyStockListPage'
import DailyStockFormPage from './pages/daily-stock/DailyStockFormPage'
import TransfersListPage from './pages/transfers/TransfersListPage'
import InitiateTransferPage from './pages/transfers/InitiateTransferPage'
import AcceptTransfersPage from './pages/accept-transfers/AcceptTransfersPage'
import AcceptTransferFormPage from './pages/accept-transfers/AcceptTransferFormPage'
import BillingPage from './pages/billing/BillingPage'
import ReturnsPage from './pages/returns/ReturnsPage'
import DamageReturnForm from './pages/returns/DamageReturnForm'
import UnsoldReturnForm from './pages/returns/UnsoldReturnForm'
import ExpiredReturnForm from './pages/returns/ExpiredReturnForm'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { Toaster } from 'react-hot-toast'

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route path="/login" element={<Navigate to="/" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Admin & Superadmin only */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin', 'admin']} />}>
              <Route path="/users" element={<UsersPage />} />
              <Route path="/production-units" element={<ProductionUnitsPage />} />
              <Route path="/canteens" element={<CanteensPage />} />
            </Route>

            {/* Admin & Prod Manager only */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin', 'admin', 'prod_manager']} />}>
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/daily-stock" element={<DailyStockListPage />} />
              <Route path="/daily-stock/new" element={<DailyStockFormPage />} />
              <Route path="/daily-stock/edit/:id" element={<DailyStockFormPage />} />
            </Route>

            {/* Shared Operational Screens */}
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/transfers" element={<TransfersListPage />} />
            <Route path="/transfers/new" element={<InitiateTransferPage />} />
            <Route path="/transfers/edit/:id" element={<InitiateTransferPage />} />
            <Route path="/accept-transfers" element={<AcceptTransfersPage />} />
            <Route path="/accept-transfers/:id" element={<AcceptTransferFormPage />} />
            <Route path="/reports" element={<ReportsPage />} />

            {/* Sales, Manager & Admin only */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin', 'admin', 'salesperson', 'prod_manager']} />}>
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/returns/damage" element={<DamageReturnForm />} />
              <Route path="/returns/unsold" element={<UnsoldReturnForm />} />
              <Route path="/returns/expiry" element={<ExpiredReturnForm />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App