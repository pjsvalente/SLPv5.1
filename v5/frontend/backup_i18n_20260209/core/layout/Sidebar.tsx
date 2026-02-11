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
  X,
  ChevronLeft
} from 'lucide-react'

// Master tenant ID for "Solution by" branding
const MASTER_TENANT_ID = 'smartlamppost'

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
  Building2
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
      { id: 'interventions', label: t('navigation.interventions'), path: '/interventions', icon: 'Wrench', order: 4 },
      { id: 'catalog', label: t('navigation.catalog'), path: '/catalog', icon: 'BookOpen', order: 5 },
      { id: 'technicians', label: t('navigation.technicians'), path: '/technicians', icon: 'HardHat', order: 6 },
      { id: 'reports', label: t('navigation.reports'), path: '/reports', icon: 'FileText', order: 7 },
    ]

    // Add admin items
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      items.push(
        { id: 'users', label: t('navigation.users'), path: '/users', icon: 'Users', order: 3 },
        { id: 'data', label: t('navigation.data'), path: '/data', icon: 'Database', order: 8 },
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
  const items = menuItems.length > 0 ? menuItems : defaultMenuItems
  const sortedItems = [...items].sort((a, b) => a.order - b.order)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out hidden lg:block',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo area */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 px-4">
          {collapsed ? (
            <img
              src={`/api/tenants/${user?.tenant_id || MASTER_TENANT_ID}/logo?t=${logoKey}`}
              alt="Logo"
              className="h-8 w-8 object-contain"
              onLoad={() => setTenantLogoLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                setTenantLogoLoaded(false)
              }}
            />
          ) : (
            <div className="flex items-center justify-center w-full">
              <img
                src={`/api/tenants/${user?.tenant_id || MASTER_TENANT_ID}/logo?t=${logoKey}`}
                alt="Logo"
                className="h-10 max-w-[180px] object-contain"
                onLoad={() => setTenantLogoLoaded(true)}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  setTenantLogoLoaded(false)
                }}
              />
              {/* Show tenant name only if no logo loaded */}
              {!tenantLogoLoaded && (
                <span className="font-semibold text-gray-900 truncate">
                  {user?.tenant_name || 'Smartlamppost'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-10rem)]">
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
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
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

        {/* Solution by Smartlamppost - Footer branding */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 bg-gray-50">
          {!collapsed ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t('navigation.solutionBy')}</span>
              <img
                src={`/api/tenants/${MASTER_TENANT_ID}/logo?t=${logoKey}`}
                alt="Smartlamppost"
                className="h-5 object-contain opacity-60"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <img
                src={`/api/tenants/${MASTER_TENANT_ID}/logo?t=${logoKey}`}
                alt="Smartlamppost"
                className="h-4 w-4 object-contain opacity-60"
                title={`${t('navigation.solutionBy')} Smartlamppost`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile header */}
        <div className="h-16 flex items-center justify-between border-b border-gray-200 px-4">
          <div className="flex items-center justify-center flex-1">
            <img
              src={`/api/tenants/${user?.tenant_id || MASTER_TENANT_ID}/logo?t=${logoKey}`}
              alt="Logo"
              className="h-10 max-w-[150px] object-contain"
              onLoad={() => setTenantLogoLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                setTenantLogoLoaded(false)
              }}
            />
            {!tenantLogoLoaded && (
              <span className="font-semibold text-gray-900 truncate">
                {user?.tenant_name || 'Smartlamppost'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-10rem)]">
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
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )
                }
              >
                <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="truncate">{t(`navigation.${item.id}`)}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Solution by Smartlamppost - Mobile Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t('navigation.solutionBy')}</span>
            <img
              src={`/api/tenants/${MASTER_TENANT_ID}/logo?t=${logoKey}`}
              alt="Smartlamppost"
              className="h-5 object-contain opacity-60"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        </div>
      </aside>
    </>
  )
}
