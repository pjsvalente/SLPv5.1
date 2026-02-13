import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import {
  IconGradientDefs,
  IconDashboard,
  IconPackage,
  IconUsers,
  IconWrench,
  IconBookOpen,
  IconHardHat,
  IconFileText,
  IconBarChart3,
  IconSettings,
  IconDatabase,
  IconBuilding,
  IconMapPin,
  IconScanLine,
  IconClose,
  IconFileSpreadsheet
} from '@/components/icons'

// Default tenant ID for logo fallback
const DEFAULT_TENANT_ID = 'smartlamppost'

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onClose: () => void
}

// Icon map using our custom icons
const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string; gradient?: boolean }>> = {
  LayoutDashboard: IconDashboard,
  Package: IconPackage,
  Users: IconUsers,
  Wrench: IconWrench,
  BookOpen: IconBookOpen,
  HardHat: IconHardHat,
  FileText: IconFileText,
  BarChart3: IconBarChart3,
  Settings: IconSettings,
  Database: IconDatabase,
  Building2: IconBuilding,
  MapPin: IconMapPin,
  ScanLine: IconScanLine,
  FileSpreadsheet: IconFileSpreadsheet
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, mobileOpen, onClose }) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const menuItems = user?.menu_items || []
  const [tenantLogoLoaded, setTenantLogoLoaded] = useState(false)
  const [logoKey, setLogoKey] = useState(Date.now())
  const [customMenuOrder, setCustomMenuOrder] = useState<string[]>([])

  // Check if tenant has a custom logo
  useEffect(() => {
    setLogoKey(Date.now())
    setTenantLogoLoaded(false)
  }, [user?.tenant_id])

  // Load custom menu order
  useEffect(() => {
    const loadMenuOrder = async () => {
      if (user?.role === 'admin' || user?.role === 'superadmin') {
        try {
          const data = await api.get('/settings/menu-order')
          if (data.menu_order && data.menu_order.length > 0) {
            setCustomMenuOrder(data.menu_order)
          }
        } catch (err) {
          // Silently ignore - will use default order
          console.debug('Menu order not available, using defaults')
        }
      }
    }
    loadMenuOrder()
  }, [user?.tenant_id, user?.role])

  // Build menu items dynamically based on user role
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

  // Apply custom order if available
  const sortedItems = React.useMemo(() => {
    const items = [...defaultMenuItems]

    if (customMenuOrder.length > 0) {
      // Create order map from custom order
      const orderMap: Record<string, number> = {}
      customMenuOrder.forEach((id, index) => {
        orderMap[id] = index
      })

      // Sort items based on custom order
      items.sort((a, b) => {
        const orderA = orderMap[a.id] ?? 1000 + a.order
        const orderB = orderMap[b.id] ?? 1000 + b.order

        // Settings always stays at the end
        if (a.id === 'settings') return 1
        if (b.id === 'settings') return -1

        return orderA - orderB
      })
    } else {
      items.sort((a, b) => a.order - b.order)
    }

    return items
  }, [defaultMenuItems, customMenuOrder])

  // Sidebar content component to avoid duplication
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Logo area - Navy gradient background */}
      <div className="h-20 flex items-center justify-center px-4 bg-gradient-to-r from-slp-navy via-slp-navy-light to-slp-blue-deep">
        {collapsed && !isMobile ? (
          <div className="flex items-center justify-center">
            <img
              src={`/api/tenants/${user?.tenant_id || DEFAULT_TENANT_ID}/logo?t=${logoKey}`}
              alt="Logo"
              className="h-10 w-10 object-contain brightness-0 invert"
              onLoad={() => setTenantLogoLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                setTenantLogoLoaded(false)
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <img
              src={`/api/tenants/${user?.tenant_id || DEFAULT_TENANT_ID}/logo?t=${logoKey}`}
              alt="Logo"
              className="h-12 max-w-[180px] object-contain brightness-0 invert"
              onLoad={() => setTenantLogoLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                setTenantLogoLoaded(false)
              }}
            />
            {!tenantLogoLoaded && (
              <span className="font-bold text-xl text-white tracking-tight">
                {user?.tenant_name || 'SmartLamppost'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Navigation - Navy background */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto bg-slp-navy">
        {sortedItems.map((item) => {
          const Icon = iconMap[item.icon] || IconPackage
          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={isMobile ? onClose : undefined}
              className={({ isActive }) =>
                cn(
                  'group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-white/15 text-white shadow-lg shadow-black/10 border border-white/10'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                  (collapsed && !isMobile) && 'justify-center px-2'
                )
              }
              title={(collapsed && !isMobile) ? t(`navigation.${item.id}`) : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={22}
                    gradient={isActive}
                    className={cn(
                      'flex-shrink-0 transition-transform duration-200',
                      !isActive && 'group-hover:scale-110',
                      (!collapsed || isMobile) && 'mr-3'
                    )}
                  />
                  {(!collapsed || isMobile) && (
                    <span className="truncate">{t(`navigation.${item.id}`)}</span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer - Solutions by Smartlamppost */}
      <div className="p-4 bg-slp-navy border-t border-white/10">
        <div className={cn(
          'flex flex-col items-center',
          (collapsed && !isMobile) ? 'gap-1' : 'gap-2'
        )}>
          {(!collapsed || isMobile) && (
            <p className="text-xs text-white/50 tracking-wide">Solutions by</p>
          )}
          <img
            src="/api/tenants/smartlamppost/logo"
            alt="Smartlamppost"
            className={cn(
              'object-contain brightness-0 invert opacity-70 hover:opacity-100 transition-opacity',
              (collapsed && !isMobile) ? 'h-6 w-6' : 'h-8 max-w-[140px]'
            )}
            onError={(e) => {
              // Fallback to text if logo fails
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const fallback = target.nextElementSibling as HTMLElement
              if (fallback) fallback.style.display = 'block'
            }}
          />
          <span
            className="text-white/70 font-semibold text-sm hidden"
            style={{ display: 'none' }}
          >
            Smartlamppost
          </span>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* SVG Gradient Definitions */}
      <IconGradientDefs />

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen flex flex-col transition-all duration-300 ease-in-out hidden lg:flex',
          'shadow-2xl shadow-black/30',
          collapsed ? 'w-20' : 'w-72'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-72 flex flex-col transition-transform duration-300 ease-in-out lg:hidden',
          'shadow-2xl shadow-black/50',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-4 z-10 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <IconClose size={20} />
        </button>

        <SidebarContent isMobile />
      </aside>
    </>
  )
}
