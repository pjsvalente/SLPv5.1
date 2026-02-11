/**
 * SmartLamppost v5.0 - Audit Log Component
 * View and filter audit log entries for compliance and tracking
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Database,
  Activity,
  Eye,
  X,
  Loader2,
  FileText,
  BarChart3,
  RefreshCw
} from 'lucide-react'

interface AuditEntry {
  id: number
  user_id: number
  action: string
  table_name: string
  record_id: number | null
  old_values: any
  new_values: any
  created_at: string
  user_name: string
  user_email: string
}

interface AuditStats {
  total: number
  today: number
  this_week: number
  by_action: { action: string; count: number }[]
  by_table: { table_name: string; count: number }[]
  top_users: { id: number; nome: string; email: string; count: number }[]
}

interface FilterOptions {
  actions: string[]
  tables: string[]
  users: { id: number; nome: string; email: string }[]
}

const AuditLog: React.FC = () => {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ actions: [], tables: [], users: [] })
  const [showFilters, setShowFilters] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 25

  // Filters
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    table_name: '',
    date_from: '',
    date_to: '',
    search: ''
  })

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('per_page', perPage.toString())

      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.action) params.append('action', filters.action)
      if (filters.table_name) params.append('table_name', filters.table_name)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      if (filters.search) params.append('search', filters.search)

      const data = await api.get(`/settings/audit-log?${params}`)
      setEntries(data.entries || [])
      setTotal(data.total || 0)
      setTotalPages(data.pages || 1)
    } catch (error) {
      console.error('Error loading audit log:', error)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  const loadFilterOptions = async () => {
    try {
      const [actionsData, usersData] = await Promise.all([
        api.get('/settings/audit-log/actions'),
        api.get('/settings/audit-log/users')
      ])
      setFilterOptions({
        actions: actionsData.actions || [],
        tables: actionsData.tables || [],
        users: usersData.users || []
      })
    } catch (error) {
      console.error('Error loading filter options:', error)
    }
  }

  const loadStats = async () => {
    try {
      const data = await api.get('/settings/audit-log/stats')
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  useEffect(() => {
    loadEntries()
    loadFilterOptions()
  }, [loadEntries])

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.action) params.append('action', filters.action)
      if (filters.table_name) params.append('table_name', filters.table_name)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)

      const response = await fetch(`/api/settings/audit-log/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting audit log:', error)
    }
  }

  const handleClearFilters = () => {
    setFilters({
      user_id: '',
      action: '',
      table_name: '',
      date_from: '',
      date_to: '',
      search: ''
    })
    setPage(1)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateString
    }
  }

  const getActionColor = (action: string): string => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getActionLabel = (action: string): string => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return t('auditLog.actionCreate')
      case 'update':
        return t('auditLog.actionUpdate')
      case 'delete':
        return t('auditLog.actionDelete')
      default:
        return action
    }
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('auditLog.description')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            {total} {t('auditLog.totalEntries')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadStats(); setShowStats(true) }}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('auditLog.statistics')}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border rounded-lg ${
              hasActiveFilters
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            {t('common.filters')}
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">!</span>
            )}
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.search')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder={t('auditLog.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            {/* User */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.user')}
              </label>
              <select
                value={filters.user_id}
                onChange={(e) => handleFilterChange('user_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">{t('common.all')}</option>
                {filterOptions.users.map(user => (
                  <option key={user.id} value={user.id}>{user.nome}</option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auditLog.action')}
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">{t('common.all')}</option>
                {filterOptions.actions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auditLog.table')}
              </label>
              <select
                value={filters.table_name}
                onChange={(e) => handleFilterChange('table_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">{t('common.all')}</option>
                {filterOptions.tables.map(table => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auditLog.dateFrom')}
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auditLog.dateTo')}
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4 mr-1" />
                {t('common.clearFilters')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t('auditLog.noEntries')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auditLog.datetime')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('common.user')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auditLog.action')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auditLog.table')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auditLog.recordId')}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {entry.user_name || t('common.unknown')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {entry.user_email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(entry.action)}`}>
                        {getActionLabel(entry.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{entry.table_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {entry.record_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                        title={t('common.viewDetails')}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('common.page')} {page} {t('common.of')} {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('auditLog.entryDetails')}
              </h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">{t('auditLog.datetime')}</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(selectedEntry.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">{t('common.user')}</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedEntry.user_name} ({selectedEntry.user_email})
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">{t('auditLog.action')}</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(selectedEntry.action)}`}>
                    {getActionLabel(selectedEntry.action)}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">{t('auditLog.table')}</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedEntry.table_name} (ID: {selectedEntry.record_id || '-'})
                  </p>
                </div>
              </div>

              {/* Old Values */}
              {selectedEntry.old_values && Object.keys(selectedEntry.old_values).length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                    {t('auditLog.oldValues')}
                  </label>
                  <pre className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-xs overflow-x-auto text-red-800 dark:text-red-300">
                    {JSON.stringify(selectedEntry.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {/* New Values */}
              {selectedEntry.new_values && Object.keys(selectedEntry.new_values).length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                    {t('auditLog.newValues')}
                  </label>
                  <pre className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-xs overflow-x-auto text-green-800 dark:text-green-300">
                    {JSON.stringify(selectedEntry.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && stats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('auditLog.statistics')}
              </h3>
              <button
                onClick={() => setShowStats(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
                  <p className="text-sm text-blue-600/70 dark:text-blue-400/70">{t('auditLog.totalEntries')}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.today}</p>
                  <p className="text-sm text-green-600/70 dark:text-green-400/70">{t('auditLog.today')}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.this_week}</p>
                  <p className="text-sm text-purple-600/70 dark:text-purple-400/70">{t('auditLog.thisWeek')}</p>
                </div>
              </div>

              {/* By Action */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('auditLog.byAction')}
                </h4>
                <div className="space-y-2">
                  {stats.by_action.map(item => (
                    <div key={item.action} className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(item.action)}`}>
                        {getActionLabel(item.action)}
                      </span>
                      <span className="text-sm text-gray-500">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Table */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('auditLog.byTable')}
                </h4>
                <div className="space-y-2">
                  {stats.by_table.slice(0, 10).map(item => (
                    <div key={item.table_name} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.table_name}</span>
                      <span className="text-sm text-gray-500">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Users */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('auditLog.topUsers')}
                </h4>
                <div className="space-y-2">
                  {stats.top_users.map(user => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{user.nome}</span>
                      </div>
                      <span className="text-sm text-gray-500">{user.count} {t('auditLog.actions')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowStats(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditLog
