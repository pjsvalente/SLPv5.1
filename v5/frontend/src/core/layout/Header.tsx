import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import {
  IconMenu,
  IconChevronLeft,
  IconChevronRight,
  IconSun,
  IconMoon,
  IconLogout,
  IconUser,
  IconBell,
  IconGradientDefs
} from '@/components/icons'

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
    <>
      <IconGradientDefs />
      <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 lg:px-6 shadow-sm">
        <div className="h-full flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center space-x-3">
            {/* Mobile menu button */}
            <button
              onClick={onToggleMobileMenu}
              className="p-2.5 rounded-xl bg-slp-navy/5 hover:bg-slp-navy/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors lg:hidden"
            >
              <IconMenu size={20} className="text-slp-navy dark:text-white" />
            </button>

            {/* Desktop sidebar toggle */}
            <button
              onClick={onToggleSidebar}
              className="p-2.5 rounded-xl bg-slp-navy/5 hover:bg-slp-navy/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors hidden lg:flex items-center justify-center"
              title={sidebarCollapsed ? t('common.view') : t('common.close')}
            >
              {sidebarCollapsed ? (
                <IconChevronRight size={20} className="text-slp-navy dark:text-white" />
              ) : (
                <IconChevronLeft size={20} className="text-slp-navy dark:text-white" />
              )}
            </button>

            {/* Page title or breadcrumb area */}
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-slp-navy dark:text-white">
                {/* Dynamic title can be added here */}
              </h1>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2 lg:space-x-3">
            {/* Powered by badge - for non-master tenants */}
            {user?.tenant_id && user.tenant_id !== 'smartlamppost' && (
              <div className="hidden md:flex items-center space-x-2 text-xs text-gray-400 border-r border-gray-200 dark:border-gray-700 pr-4 mr-2">
                <span className="text-gray-400 dark:text-gray-500">powered by</span>
                <img
                  src="/api/tenants/smartlamppost/logo"
                  alt="Smartlamppost"
                  className="h-5 object-contain dark:invert"
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
              className="p-2.5 rounded-xl bg-slp-navy/5 hover:bg-slp-navy/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
              title={isDark ? t('settings.themes.light') : t('settings.themes.dark')}
            >
              {isDark ? (
                <IconSun size={20} className="text-amber-500" />
              ) : (
                <IconMoon size={20} className="text-slp-navy" />
              )}
            </button>

            {/* Notifications */}
            <button
              className="p-2.5 rounded-xl bg-slp-navy/5 hover:bg-slp-navy/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors relative"
              title={t('settings.notifications')}
            >
              <IconBell size={20} className="text-slp-navy dark:text-white" />
              {/* Notification badge */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-slp-cyan rounded-full border-2 border-white dark:border-gray-900" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slp-navy/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slp-cyan to-slp-blue-bright flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">
                    {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold text-slp-navy dark:text-white">
                    {user?.first_name || user?.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
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
                  <div className="absolute right-0 sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-64 max-w-[280px] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                    {/* User info header */}
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-slp-navy via-slp-navy-light to-slp-blue-deep">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-base sm:text-lg">
                            {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white truncate">
                            {user?.first_name} {user?.last_name}
                          </div>
                          <div className="text-xs text-white/70 truncate">
                            {user?.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tenant info */}
                    <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Organização</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user?.tenant_name || user?.tenant_id}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          logout()
                        }}
                        className="w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                      >
                        <IconLogout size={18} className="mr-3" />
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
    </>
  )
}
