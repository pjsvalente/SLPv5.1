import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user } = useAuth()

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        {/* Header */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onToggleMobileMenu={toggleMobileMenu}
        />

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
