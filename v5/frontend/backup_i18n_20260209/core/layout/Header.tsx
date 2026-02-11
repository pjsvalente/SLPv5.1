import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  User,
  Bell
} from 'lucide-react'

interface HeaderProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  onToggleMobileMenu: () => void
}

export const Header: React.FC<HeaderProps> = ({
  sidebarCollapsed,
  onToggleSidebar,
  onToggleMobileMenu
}) => {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [showUserMenu, setShowUserMenu] = React.useState(false)

  const roleLabels: Record<string, string> = {
    superadmin: 'Super Admin',
    admin: t('users.roles.admin'),
    operator: t('users.roles.manager'),
    user: t('users.roles.viewer')
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 px-4 lg:px-6">
      <div className="h-full flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onToggleMobileMenu}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 hidden lg:block"
            title={sidebarCollapsed ? t('common.view') : t('common.close')}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Powered by badge - for non-master tenants */}
          {user?.tenant_id && user.tenant_id !== 'smartlamppost' && (
            <div className="hidden md:flex items-center space-x-1 text-xs text-gray-400 border-r pr-4 mr-2">
              <span>powered by</span>
              <img
                src="/api/tenants/smartlamppost/logo"
                alt="Smartlamppost"
                className="h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  const fallback = (e.target as HTMLImageElement).nextElementSibling
                  if (fallback) (fallback as HTMLElement).style.display = 'inline'
                }}
              />
              <span className="hidden font-semibold text-gray-500">Smartlamppost</span>
            </div>
          )}

          {/* Language selector */}
          <LanguageSelector variant="compact" />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100"
            title={isDark ? t('settings.themes.light') : t('settings.themes.dark')}
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Notifications */}
          <button
            className="p-2 rounded-lg hover:bg-gray-100 relative"
            title={t('settings.notifications')}
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-700">
                  {user?.first_name || user?.email?.split('@')[0]}
                </div>
                <div className="text-xs text-gray-500">
                  {roleLabels[user?.role || 'user']}
                </div>
              </div>
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="p-3 border-b border-gray-100">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user?.tenant_name || user?.tenant_id}
                    </div>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        logout()
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('auth.logout')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
