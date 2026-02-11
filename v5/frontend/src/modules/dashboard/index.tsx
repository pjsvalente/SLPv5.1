import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { LoadingSpinner } from '@/core/common/LoadingSpinner'
import { Package, Users, Wrench, TrendingUp, MapPin, Plus, ClipboardList } from 'lucide-react'
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
  'Operacional': '#22c55e',
  'Manutencao Necessaria': '#f59e0b',
  'Manutencao': '#f59e0b',
  'Em Reparação': '#f97316',
  'Avariado': '#ef4444',
  'Desativado': '#6b7280',
  'em_curso': '#3b82f6',
  'concluida': '#22c55e',
  'cancelada': '#ef4444',
  'pendente': '#f59e0b',
  'preventiva': '#22c55e',
  'corretiva': '#f59e0b',
  'substituicao': '#3b82f6',
  'inspecao': '#8b5cf6',
  'default': '#94a3b8'
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
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
        {error}
      </div>
    )
  }

  const statCards = [
    {
      label: t('dashboard.totalAssets'),
      value: stats?.total_assets || 0,
      icon: Package,
      color: 'bg-blue-500',
      link: '/assets'
    },
    {
      label: t('dashboard.thisMonth'),
      value: stats?.recent_assets || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
      link: '/assets'
    },
    {
      label: t('navigation.users'),
      value: stats?.total_users || 0,
      icon: Users,
      color: 'bg-purple-500',
      link: '/users'
    },
    {
      label: t('dashboard.pendingInterventions'),
      value: stats?.open_interventions || 0,
      icon: Wrench,
      color: 'bg-orange-500',
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
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900 dark:text-gray-100">{payload[0].name}</p>
          <p className="text-gray-600 dark:text-gray-400">{payload[0].value}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.overview')}</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              onClick={() => navigate(stat.link)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets by Status - Pie Chart */}
        {assetStatusData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('reports.assetsByStatus')}
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {assetStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {assetStatusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interventions by Type - Bar Chart */}
        {interventionTypeData.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('reports.interventionsByType')}
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interventionTypeData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {interventionTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : interventionStatusData.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('reports.interventionsByStatus')}
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={interventionStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {interventionStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {interventionStatusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('dashboard.quickActions')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/assets/new')}
            className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            <div className="p-2 bg-blue-500 rounded-lg">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <span className="font-medium text-blue-700 dark:text-blue-300">{t('assets.newAsset')}</span>
          </button>

          <button
            onClick={() => navigate('/interventions/new')}
            className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
          >
            <div className="p-2 bg-orange-500 rounded-lg">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <span className="font-medium text-orange-700 dark:text-orange-300">{t('interventions.newIntervention')}</span>
          </button>

          <button
            onClick={() => navigate('/map')}
            className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
          >
            <div className="p-2 bg-green-500 rounded-lg">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <span className="font-medium text-green-700 dark:text-green-300">{t('navigation.map')}</span>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
          >
            <div className="p-2 bg-purple-500 rounded-lg">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <span className="font-medium text-purple-700 dark:text-purple-300">{t('navigation.reports')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
