import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/core/layout/DashboardLayout'
import { LoginPage } from '@/core/auth/LoginPage'
import { TwoFactorPage } from '@/core/auth/TwoFactorPage'
import { ChangePasswordPage } from '@/core/auth/ChangePasswordPage'
import { LoadingSpinner } from '@/core/common/LoadingSpinner'
import { ToastProvider } from '@/components/ui/Toast'
import { LandingPage } from '@/pages/LandingPage'

// Lazy load modules
const Dashboard = lazy(() => import('@/modules/dashboard'))
const Assets = lazy(() => import('@/modules/assets'))
const Users = lazy(() => import('@/modules/users'))
const Settings = lazy(() => import('@/modules/settings'))
const Interventions = lazy(() => import('@/modules/interventions'))
const Technicians = lazy(() => import('@/modules/technicians'))
const Reports = lazy(() => import('@/modules/reports'))
const Catalog = lazy(() => import('@/modules/catalog'))
const DataManagement = lazy(() => import('@/modules/data'))
const Tenants = lazy(() => import('@/modules/tenants'))
const PlansConfig = lazy(() => import('@/modules/plans'))
const Map = lazy(() => import('@/modules/map'))
const Scanner = lazy(() => import('@/modules/scanner'))
const Analytics = lazy(() => import('@/modules/analytics'))
const CustomReports = lazy(() => import('@/modules/reports/CustomReports'))

// Placeholder for modules not yet implemented
const ComingSoon = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">Em Desenvolvimento</h2>
      <p className="text-gray-500 dark:text-gray-400 mt-2">Este modulo estara disponivel em breve.</p>
    </div>
  </div>
)

function App() {
  const { user, loading, mustChangePassword, requires2FA } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // 2FA flow
  if (requires2FA) {
    return <TwoFactorPage />
  }

  // Not authenticated - show landing page and login
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  // Must change password
  if (mustChangePassword) {
    return <ChangePasswordPage />
  }

  // Authenticated - show dashboard layout
  return (
    <ToastProvider>
      <DashboardLayout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/assets/*" element={<Assets />} />
            <Route path="/interventions/*" element={<Interventions />} />
            <Route path="/catalog/*" element={<Catalog />} />
            <Route path="/technicians/*" element={<Technicians />} />
            <Route path="/reports/*" element={<Reports />} />
            <Route path="/data/*" element={<DataManagement />} />
            <Route path="/users/*" element={<Users />} />
            <Route path="/tenants/*" element={<Tenants />} />
            <Route path="/plans" element={<PlansConfig />} />
            <Route path="/map/*" element={<Map />} />
            <Route path="/scan" element={<Scanner />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/custom-reports" element={<CustomReports />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </ToastProvider>
  )
}

export default App
