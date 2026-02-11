import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { LoadingSpinner } from '@/core/common/LoadingSpinner'
import {
  IconPackage,
  IconUsers,
  IconWrench,
  IconTrendingUp,
  IconMapPin,
  IconPlus,
  IconClipboardList,
  IconGradientDefs,
  IconScanLine,
  IconBarChart3
} from '@/components/icons'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

interface Stats {
  total_assets: number
  recent_assets: number
  total_users: number
  total_interventions: number
  open_interventions: number
  assets_by_status: { status: string; count: number }[]
  interventions_by_type?: { type: string; count: number }[]
  interventions_by_status?: { status: string; count: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  'Operacional': '#00C853',
  'Manutencao Necessaria': '#FFB300',
  'Manutencao': '#FFB300',
  'Em Reparação': '#FF9100',
  'Avariado': '#FF5252',
  'Desativado': '#78909C',
  'em_curso': '#00A0DC',
  'concluida': '#00C853',
  'cancelada': '#FF5252',
  'pendente': '#FFB300',
  'preventiva': '#00C853',
  'corretiva': '#FFB300',
  'substituicao': '#00A0DC',
  'inspecao': '#7C4DFF',
  'default': '#90A4AE'
}

const getColor = (key: string) => STATUS_COLORS[key] || STATUS_COLORS.default

const Dashboard: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await api.get('/dashboard/stats')
      setStats(data)
    } catch (err: any) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-2xl">
        {error}
      </div>
    )
  }

  const statCards = [
    {
      label: t('dashboard.totalAssets'),
      value: stats?.total_assets || 0,
      icon: IconPackage,
      gradient: 'from-slp-cyan to-slp-blue-bright',
      bgLight: 'bg-slp-cyan/10',
      link: '/assets'
    },
    {
      label: t('dashboard.thisMonth'),
      value: stats?.recent_assets || 0,
      icon: IconTrendingUp,
      gradient: 'from-emerald-400 to-emerald-600',
      bgLight: 'bg-emerald-500/10',
      link: '/assets'
    },
    {
      label: t('navigation.users'),
      value: stats?.total_users || 0,
      icon: IconUsers,
      gradient: 'from-violet-400 to-violet-600',
      bgLight: 'bg-violet-500/10',
      link: '/users'
    },
    {
      label: t('dashboard.pendingInterventions'),
      value: stats?.open_interventions || 0,
      icon: IconWrench,
      gradient: 'from-amber-400 to-orange-500',
      bgLight: 'bg-amber-500/10',
      link: '/interventions'
    }
  ]

  // Prepare chart data
  const assetStatusData = stats?.assets_by_status?.map(item => ({
    name: item.status || t('common.noData'),
    value: item.count,
    fill: getColor(item.status)
  })) || []

  const interventionTypeData = stats?.interventions_by_type?.map(item => ({
    name: t(`interventions.types.${item.type}`) || item.type,
    value: item.count,
    fill: getColor(item.type)
  })) || []

  const interventionStatusData = stats?.interventions_by_status?.map(item => ({
    name: item.status === 'em_curso' ? t('interventions.statuses.inProgress') :
          item.status === 'concluida' ? t('interventions.statuses.completed') :
          item.status === 'cancelada' ? t('interventions.statuses.cancelled') :
          item.status,
    value: item.count,
    fill: getColor(item.status)
  })) || []

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{payload[0].name}</p>
          <p className="text-2xl font-bold text-slp-blue-bright">{payload[0].value}</p>
        </div>
      )
    }
    return null
  }

  return (
    <>
      <IconGradientDefs />
      <div className="space-y-6">
        {/* Page header with gradient accent */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slp-navy dark:text-white flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-slp-cyan to-slp-blue-bright">
                <IconBarChart3 size={20} className="text-white sm:hidden" />
                <IconBarChart3 size={24} className="text-white hidden sm:block" />
              </div>
              {t('dashboard.title')}
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">{t('dashboard.overview')}</p>
          </div>
        </div>

        {/* Stats cards with gradient icons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                onClick={() => navigate(stat.link)}
                className="group bg-white dark:bg-gray-800/80 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-3 sm:p-6 cursor-pointer hover:shadow-xl hover:shadow-slp-navy/5 dark:hover:shadow-black/20 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{stat.label}</p>
                    <p className="text-xl sm:text-3xl font-bold text-slp-navy dark:text-white">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0 ml-2`}>
                    <Icon size={16} className="text-white sm:hidden" />
                    <Icon size={24} className="text-white hidden sm:block" />
                  </div>
                </div>
                {/* Progress bar decoration - hidden on mobile */}
                <div className="hidden sm:block mt-4 h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${stat.gradient} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, (stat.value / (stats?.total_assets || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Assets by Status - Pie Chart */}
          {assetStatusData.length > 0 && (
            <div className="bg-white dark:bg-gray-800/80 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="p-1.5 sm:p-2 rounded-lg bg-slp-navy/10 dark:bg-slp-cyan/20">
                  <IconPackage size={16} gradient className="text-slp-navy dark:text-slp-cyan sm:hidden" />
                  <IconPackage size={20} gradient className="text-slp-navy dark:text-slp-cyan hidden sm:block" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slp-navy dark:text-white">
                  {t('reports.assetsByStatus')}
                </h2>
              </div>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {assetStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4">
                {assetStatusData.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-sm" style={{ backgroundColor: item.fill }} />
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[80px] sm:max-w-none">{item.name}</span>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interventions by Type - Bar Chart */}
          {interventionTypeData.length > 0 ? (
            <div className="bg-white dark:bg-gray-800/80 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20">
                  <IconWrench size={16} className="text-amber-600 dark:text-amber-400 sm:hidden" />
                  <IconWrench size={20} className="text-amber-600 dark:text-amber-400 hidden sm:block" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slp-navy dark:text-white">
                  {t('reports.interventionsByType')}
                </h2>
              </div>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={interventionTypeData} layout="vertical">
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={80}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {interventionTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : interventionStatusData.length > 0 ? (
            <div className="bg-white dark:bg-gray-800/80 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20">
                  <IconWrench size={16} className="text-amber-600 dark:text-amber-400 sm:hidden" />
                  <IconWrench size={20} className="text-amber-600 dark:text-amber-400 hidden sm:block" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slp-navy dark:text-white">
                  {t('reports.interventionsByStatus')}
                </h2>
              </div>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={interventionStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {interventionStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4">
                {interventionStatusData.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-sm" style={{ backgroundColor: item.fill }} />
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Quick Actions - Modern Card Grid */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="p-1.5 sm:p-2 rounded-lg bg-slp-navy/10 dark:bg-slp-cyan/20">
              <IconScanLine size={16} gradient className="sm:hidden" />
              <IconScanLine size={20} gradient className="hidden sm:block" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-slp-navy dark:text-white">
              {t('dashboard.quickActions')}
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <button
              onClick={() => navigate('/assets/new')}
              className="group flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-gradient-to-br from-slp-cyan/5 to-slp-blue-bright/10 dark:from-slp-cyan/10 dark:to-slp-blue-bright/20 hover:from-slp-cyan/10 hover:to-slp-blue-bright/20 dark:hover:from-slp-cyan/20 dark:hover:to-slp-blue-bright/30 rounded-xl border border-slp-cyan/20 dark:border-slp-cyan/30 transition-all duration-300"
            >
              <div className="p-2 sm:p-3 bg-gradient-to-br from-slp-cyan to-slp-blue-bright rounded-lg sm:rounded-xl shadow-lg shadow-slp-cyan/30 group-hover:scale-110 transition-transform">
                <IconPlus size={16} className="text-white sm:hidden" />
                <IconPlus size={20} className="text-white hidden sm:block" />
              </div>
              <div className="text-center sm:text-left">
                <span className="font-semibold text-xs sm:text-base text-slp-navy dark:text-white block">{t('assets.newAsset')}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{t('assets.create')}</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/interventions/new')}
              className="group flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-gradient-to-br from-amber-500/5 to-orange-500/10 dark:from-amber-500/10 dark:to-orange-500/20 hover:from-amber-500/10 hover:to-orange-500/20 dark:hover:from-amber-500/20 dark:hover:to-orange-500/30 rounded-xl border border-amber-500/20 dark:border-amber-500/30 transition-all duration-300"
            >
              <div className="p-2 sm:p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg sm:rounded-xl shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                <IconWrench size={16} className="text-white sm:hidden" />
                <IconWrench size={20} className="text-white hidden sm:block" />
              </div>
              <div className="text-center sm:text-left">
                <span className="font-semibold text-xs sm:text-base text-slp-navy dark:text-white block">{t('interventions.newIntervention')}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{t('interventions.create')}</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/map')}
              className="group flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 dark:from-emerald-500/10 dark:to-emerald-600/20 hover:from-emerald-500/10 hover:to-emerald-600/20 dark:hover:from-emerald-500/20 dark:hover:to-emerald-600/30 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30 transition-all duration-300"
            >
              <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg sm:rounded-xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                <IconMapPin size={16} className="text-white sm:hidden" />
                <IconMapPin size={20} className="text-white hidden sm:block" />
              </div>
              <div className="text-center sm:text-left">
                <span className="font-semibold text-xs sm:text-base text-slp-navy dark:text-white block">{t('navigation.map')}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{t('map.viewAssets')}</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="group flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-gradient-to-br from-violet-500/5 to-violet-600/10 dark:from-violet-500/10 dark:to-violet-600/20 hover:from-violet-500/10 hover:to-violet-600/20 dark:hover:from-violet-500/20 dark:hover:to-violet-600/30 rounded-xl border border-violet-500/20 dark:border-violet-500/30 transition-all duration-300"
            >
              <div className="p-2 sm:p-3 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg sm:rounded-xl shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
                <IconClipboardList size={16} className="text-white sm:hidden" />
                <IconClipboardList size={20} className="text-white hidden sm:block" />
              </div>
              <div className="text-center sm:text-left">
                <span className="font-semibold text-xs sm:text-base text-slp-navy dark:text-white block">{t('navigation.reports')}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{t('reports.view')}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Dashboard
