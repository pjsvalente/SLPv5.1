/**
 * SmartLamppost v5.0 - Reports Module
 * Statistics and report generation with Recharts visualizations
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useApi } from '@/hooks/useApi'
import { useLanguage } from '@/hooks/useLanguage'
import { FormField, StatusBadge } from '@/components/ui'
import {
  IconPieChart, IconTrendingUp, IconPackage, IconWrench, IconUsers, IconClock,
  IconRefreshCw, IconDownload
} from '@/components/icons'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid, Legend
} from 'recharts'

interface GeneralStats {
  total_assets: number
  assets_by_status: Record<string, number>
  total_interventions: number
  interventions_by_status: Record<string, number>
  interventions_by_type: Record<string, number>
  total_technicians: number
  active_technicians: number
  total_users: number
  active_users: number
  recent_interventions: number
  recent_assets: number
}

interface InterventionReport {
  interventions: any[]
  stats: {
    total: number
    by_type: Record<string, number>
    by_status: Record<string, number>
    avg_duration: number
  }
  period: { start: string; end: string }
}

const STATUS_COLORS: Record<string, string> = {
  'Operacional': '#22c55e',
  'Manutencao Necessaria': '#f59e0b',
  'manutencao': '#f59e0b',
  'Em Reparação': '#f97316',
  'Avariado': '#ef4444',
  'ativo': '#22c55e',
  'inativo': '#6b7280',
  'Desativado': '#6b7280',
  'abatido': '#dc2626',
  'em_curso': '#3b82f6',
  'concluida': '#22c55e',
  'cancelada': '#ef4444',
  'preventiva': '#22c55e',
  'corretiva': '#f59e0b',
  'substituicao': '#3b82f6',
  'inspecao': '#8b5cf6',
  'default': '#94a3b8'
}

const getColor = (key: string): string => STATUS_COLORS[key] || STATUS_COLORS.default

export default function ReportsModule() {
  const { t } = useTranslation()
  const { formatDate } = useLanguage()
  const api = useApi()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<GeneralStats | null>(null)
  const [interventionReport, setInterventionReport] = useState<InterventionReport | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'interventions' | 'assets' | 'technicians'>('overview')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  })

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/reports/stats')
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }, [api])

  const loadInterventionReport = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end
      })
      const data = await api.get(`/reports/interventions?${params.toString()}`)
      setInterventionReport(data)
    } catch (error) {
      console.error('Error loading intervention report:', error)
    }
  }, [api, dateRange])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (activeTab === 'interventions') {
      loadInterventionReport()
    }
  }, [activeTab, loadInterventionReport])

  const tabs = [
    { id: 'overview', label: t('reports.overview'), icon: IconPieChart },
    { id: 'interventions', label: t('navigation.interventions'), icon: IconWrench },
    { id: 'assets', label: t('navigation.assets'), icon: IconPackage },
    { id: 'technicians', label: t('navigation.technicians'), icon: IconUsers }
  ]

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

  const renderOverview = () => {
    if (!stats) return null

    // Prepare chart data
    const assetStatusData = Object.entries(stats.assets_by_status).map(([status, count]) => ({
      name: status,
      value: count,
      fill: getColor(status)
    }))

    const interventionStatusData = Object.entries(stats.interventions_by_status || {}).map(([status, count]) => ({
      name: status === 'em_curso' ? t('interventions.statuses.inProgress') :
            status === 'concluida' ? t('interventions.statuses.completed') :
            status === 'cancelada' ? t('interventions.statuses.cancelled') : status,
      value: count,
      fill: getColor(status)
    }))

    const interventionTypeData = Object.entries(stats.interventions_by_type || {}).map(([type, count]) => ({
      name: t(`interventions.types.${type}`) || type,
      value: count,
      fill: getColor(type)
    }))

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <IconPackage className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.totalAssets')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total_assets}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <IconWrench className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.totalInterventions')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total_interventions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <IconUsers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.activeTechnicians')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.active_technicians}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <IconTrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.last30Days')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.recent_interventions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets by Status - Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.assetsByStatus')}</h3>
            {assetStatusData.length > 0 ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
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
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">{t('common.noData')}</div>
            )}
          </div>

          {/* Interventions by Status - Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.interventionsByStatus')}</h3>
            {interventionStatusData.length > 0 ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={interventionStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
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
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">{t('common.noData')}</div>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Interventions by Type - Bar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.interventionsByType')}</h3>
            {interventionTypeData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={interventionTypeData} layout="vertical">
                    <XAxis type="number" tick={{ fill: '#6b7280' }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {interventionTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">{t('common.noData')}</div>
            )}
          </div>

          {/* Users Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('navigation.users')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats.total_users}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('common.total')}</p>
              </div>
              <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">{stats.active_users}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('common.active')}</p>
              </div>
              <div className="text-center p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{stats.total_technicians}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('navigation.technicians')}</p>
              </div>
              <div className="text-center p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">{stats.recent_assets}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('dashboard.thisMonth')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderInterventions = () => {
    const interventionTypeData = interventionReport?.stats.by_type
      ? Object.entries(interventionReport.stats.by_type).map(([type, count]) => ({
          name: t(`interventions.types.${type}`) || type,
          value: count,
          fill: getColor(type)
        }))
      : []

    return (
      <div className="space-y-6">
        {/* Date Range Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <FormField
              name="start_date"
              label={t('reports.startDate')}
              type="date"
              value={dateRange.start}
              onChange={(value) => setDateRange(prev => ({ ...prev, start: value }))}
            />
            <FormField
              name="end_date"
              label={t('reports.endDate')}
              type="date"
              value={dateRange.end}
              onChange={(value) => setDateRange(prev => ({ ...prev, end: value }))}
            />
            <button
              onClick={loadInterventionReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <IconRefreshCw className="w-4 h-4" />
              {t('common.refresh')}
            </button>
          </div>
        </div>

        {interventionReport && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.totalInPeriod')}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{interventionReport.stats.total}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('interventions.statuses.completed')}</p>
                <p className="text-3xl font-bold text-green-600">
                  {interventionReport.stats.by_status?.concluida || 0}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('interventions.statuses.inProgress')}</p>
                <p className="text-3xl font-bold text-blue-600">
                  {interventionReport.stats.by_status?.em_curso || 0}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <IconClock className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.averageDuration')}</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{interventionReport.stats.avg_duration}h</p>
              </div>
            </div>

            {/* Chart */}
            {interventionTypeData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.interventionsByType')}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={interventionTypeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#6b7280' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {interventionTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent Interventions List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('reports.recentInterventions')}</h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {interventionReport.interventions.slice(0, 20).map((int) => (
                  <div key={int.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{int.numero}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{int.asset_serial || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={int.tipo} />
                      <StatusBadge status={int.estado} />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(int.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
                {interventionReport.interventions.length === 0 && (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {t('common.noData')}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const renderAssets = () => {
    if (!stats) return null

    const assetStatusData = Object.entries(stats.assets_by_status).map(([status, count]) => ({
      name: status,
      value: count,
      fill: getColor(status)
    }))

    return (
      <div className="space-y-6">
        {/* Asset Distribution Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.assetDistribution')}</h3>
          {assetStatusData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {assetStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 content-center">
                {assetStatusData.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.fill }} />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.value}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">{t('common.noData')}</div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('reports.recentActivity')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500 rounded-xl">
                  <IconPackage className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.recent_assets}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('reports.assetsCreatedLast30Days', { count: stats.recent_assets })}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500 rounded-xl">
                  <IconWrench className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.recent_interventions}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('reports.last30Days')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTechnicians = () => {
    if (!stats) return null

    const technicianData = [
      { name: t('common.active'), value: stats.active_technicians, fill: '#22c55e' },
      { name: t('common.inactive'), value: stats.total_technicians - stats.active_technicians, fill: '#94a3b8' }
    ].filter(d => d.value > 0)

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('navigation.technicians')}</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats.total_technicians}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('common.total')}</p>
              </div>
              <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">{stats.active_technicians}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('common.active')}</p>
              </div>
            </div>

            {/* Chart */}
            {technicianData.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={technicianData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {technicianData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('reports.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('reports.subtitle')}</p>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <IconRefreshCw className="w-4 h-4" />
          {t('common.refresh')}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'interventions' && renderInterventions()}
      {activeTab === 'assets' && renderAssets()}
      {activeTab === 'technicians' && renderTechnicians()}
    </div>
  )
}
