import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  Users,
  Wrench,
  BookOpen,
  HardHat,
  FileText,
  BarChart3,
  Settings,
  Database,
  Building2,
  MapPin,
  ScanLine,
  X,
  ChevronLeft,
  FileSpreadsheet
} from 'lucide-react'

// Default tenant ID for logo fallback
const DEFAULT_TENANT_ID = 'smartlamppost'

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onClose: () => void
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Package,
  Users,
  Wrench,
  BookOpen,
  HardHat,
  FileText,
  BarChart3,
  Settings,
  Database,
  Building2,
  MapPin,
  ScanLine,
  FileSpreadsheet
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, mobileOpen, onClose }) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const menuItems = user?.menu_items || []
  const [tenantLogoLoaded, setTenantLogoLoaded] = useState(false)
  const [logoKey, setLogoKey] = useState(Date.now())

  // Check if tenant has a custom logo
  useEffect(() => {
    setLogoKey(Date.now())
    setTenantLogoLoaded(false)
  }, [user?.tenant_id])

  // Build menu items dynamically based on user role
  // Using useMemo-like pattern inside render to ensure labels update when language changes
  const buildMenuItems = () => {
    const items = [
      { id: 'dashboard', label: t('navigation.dashboard'), path: '/dashboard', icon: 'LayoutDashboard', order: 1 },
      { id: 'assets', label: t('navigation.assets'), path: '/assets', icon: 'Package', order: 2 },
      { id: 'scan', label: t('navigation.scan'), path: '/scan', icon: 'ScanLine', order: 3 },
      { id: 'map', label: t('navigation.map'), path: '/map', icon: 'MapPin', order: 4 },
      { id: 'interventions', label: t('navigation.interventions'), path: '/interventions', icon: 'Wrench', order: 5 },
      { id: 'catalog', label: t('navigation.catalog'), path: '/catalog', icon: 'BookOpen', order: 6 },
      { id: 'technicians', label: t('navigation.technicians'), path: '/technicians', icon: 'HardHat', order: 7 },
      { id: 'reports', label: t('navigation.reports'), path: '/reports', icon: 'FileText', order: 8 },
      { id: 'customReports', label: t('navigation.customReports'), path: '/custom-reports', icon: 'FileSpreadsheet', order: 9 },
      { id: 'analytics', label: t('navigation.analytics'), path: '/analytics', icon: 'BarChart3', order: 10 },
    ]

    // Add admin items
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      items.push(
        { id: 'users', label: t('navigation.users'), path: '/users', icon: 'Users', order: 10 },
        { id: 'data', label: t('navigation.data'), path: '/data', icon: 'Database', order: 11 },
        { id: 'settings', label: t('navigation.settings'), path: '/settings', icon: 'Settings', order: 99 }
      )
    }

    // Add superadmin only items
    if (user?.role === 'superadmin') {
      items.push(
        { id: 'tenants', label: t('navigation.tenants'), path: '/tenants', icon: 'Building2', order: 97 }
      )
    }

    return items
  }

  const defaultMenuItems = buildMenuItems()
  // Always use defaultMenuItems to include new modules like map
  // User menu_items may be outdated from older sessions
  const sortedItems = [...defaultMenuItems].sort((a, b) => a.order - b.order)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out hidden lg:block',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo area */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700 px-4">
          {collapsed ? (
            <img
              src={`/api/tenants/${user?.tenant_id || DEFAULT_TENANT_ID}/logo?t=${logoKey}`}
              alt="Logo"
              className="h-8 w-8 object-contain dark:invert"
              onLoad={() => setTenantLogoLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                setTenantLogoLoaded(false)
              }}
            />
          ) : (
            <div className="flex items-center justify-center w-full">
              <img
                src={`/api/tenants/${user?.tenant_id || DEFAULT_TENANT_ID}/logo?t=${logoKey}`}
                alt="Logo"
                className="h-10 max-w-[180px] object-contain dark:invert"
                onLoad={() => setTenantLogoLoaded(true)}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  setTenantLogoLoaded(false)
                }}
              />
              {/* Show tenant name only if no logo loaded */}
              {!tenantLogoLoaded && (
                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {user?.tenant_name || 'Smartlamppost'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {sortedItems.map((item) => {
            const Icon = iconMap[item.icon] || Package
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
                    collapsed && 'justify-center'
                  )
                }
                title={collapsed ? t(`navigation.${item.id}`) : undefined}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', !collapsed && 'mr-3')} />
                {!collapsed && <span className="truncate">{t(`navigation.${item.id}`)}</span>}
              </NavLink>
            )
          })}
        </nav>

      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile header */}
        <div className="h-16 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4">
          <div className="flex items-center justify-center flex-1">
            <img
              src={`/api/tenants/${user?.tenant_id || DEFAULT_TENANT_ID}/logo?t=${logoKey}`}
              alt="Logo"
              className="h-10 max-w-[150px] object-contain dark:invert"
              onLoad={() => setTenantLogoLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                setTenantLogoLoaded(false)
              }}
            />
            {!tenantLogoLoaded && (
              <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {user?.tenant_name || 'Smartlamppost'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {sortedItems.map((item) => {
            const Icon = iconMap[item.icon] || Package
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                  )
                }
              >
                <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="truncate">{t(`navigation.${item.id}`)}</span>
              </NavLink>
            )
          })}
        </nav>

      </aside>
    </>
  )
}
