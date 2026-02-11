/**
 * SmartLamppost v5.0 - Catalog Module
 * Complete catalog management for RFID v3 features:
 * - Statistics (overview)
 * - Packs
 * - Columns (postes)
 * - Luminaires
 * - Electrical Panels
 * - Fuse Boxes
 * - Telemetry Panels
 * - EV Chargers
 * - MUPI
 * - Lateral Modules
 * - Antennas
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useApi } from '@/hooks/useApi'
import { FormField, ConfirmDialog, StatusBadge } from '@/components/ui'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconSave,
  IconX,
  IconDownload,
  IconUpload,
  IconLoader,
  IconFileSpreadsheet,
  IconBarChart3,
  IconChevronDown,
  IconChevronUp,
  IconCheckCircle,
  IconXCircle,
  IconAlertTriangle,
  IconColumns,
  IconPackage,
  IconLightbulb,
  IconZap,
  IconBox,
  IconRadio,
  IconCar,
  IconMonitor,
  IconPanelLeft,
  IconAntenna,
  IconSearch,
  IconFilter,
  IconMoreHorizontal,
  IconInfo,
  IconGradientDefs
} from '@/components/icons'

// =========================================================================
// TYPES
// =========================================================================

interface CatalogStats {
  total_columns: number
  total_luminaires: number
  total_electrical_panels: number
  total_fuse_boxes: number
  total_telemetry: number
  total_ev_chargers: number
  total_mupi: number
  total_lateral: number
  total_antennas: number
  by_pack: Array<{ pack: string; count: number }>
  by_height: Array<{ height: number; count: number }>
}

interface CatalogPack {
  id: number
  name: string
  description: string
  color: string
  active: number
}

interface CatalogColumn {
  id: number
  reference: string
  description: string
  pack: string
  height_m: number
  arm_count: number
  mod1: number
  mod2: number
  mod3: number
  mod4: number
  mod5: number
  mod6: number
  mod7: number
  mod8: number
  active: number
}

interface CatalogLuminaire {
  id: number
  reference: string
  description: string
  manufacturer: string
  power_w: number
  lumens: number
  color_temp_k: number
  ip_rating: string
  dimmable: number
  active: number
}

interface CatalogElectricalPanel {
  id: number
  reference: string
  description: string
  manufacturer: string
  max_power_total: number
  max_power_per_phase: number
  phases: number
  voltage: string
  active: number
}

interface CatalogFuseBox {
  id: number
  reference: string
  description: string
  manufacturer: string
  max_power: number
  fuse_count: number
  active: number
}

interface CatalogTelemetryPanel {
  id: number
  reference: string
  description: string
  manufacturer: string
  power_consumption_w: number
  connectivity: string
  features: string
  active: number
}

interface CatalogEVCharger {
  id: number
  reference: string
  description: string
  manufacturer: string
  power_kw: number
  connector_type: string
  phases: number
  active: number
}

interface CatalogMUPI {
  id: number
  reference: string
  description: string
  manufacturer: string
  power_consumption_w: number
  screen_size: string
  digital: number
  active: number
}

interface CatalogLateral {
  id: number
  reference: string
  description: string
  manufacturer: string
  power_consumption_w: number
  module_type: string
  active: number
}

interface CatalogAntenna {
  id: number
  reference: string
  description: string
  manufacturer: string
  power_consumption_w: number
  frequency_band: string
  technology: string
  active: number
}

// =========================================================================
// TAB DEFINITIONS
// =========================================================================

type TabId = 'stats' | 'packs' | 'columns' | 'luminaires' | 'electrical' | 'fuse' | 'telemetry' | 'ev' | 'mupi' | 'lateral' | 'antennas'

const TABS: Array<{ id: TabId; labelKey: string; icon: React.ElementType }> = [
  { id: 'stats', labelKey: 'catalog.statistics', icon: IconBarChart3 },
  { id: 'packs', labelKey: 'catalogModule.packs', icon: IconPackage },
  { id: 'columns', labelKey: 'catalog.columns', icon: IconColumns },
  { id: 'luminaires', labelKey: 'catalog.luminaires', icon: IconLightbulb },
  { id: 'electrical', labelKey: 'catalog.electricalPanels', icon: IconZap },
  { id: 'fuse', labelKey: 'catalog.fuseBoxes', icon: IconBox },
  { id: 'telemetry', labelKey: 'catalog.telemetry', icon: IconRadio },
  { id: 'ev', labelKey: 'catalog.evChargers', icon: IconCar },
  { id: 'mupi', labelKey: 'catalog.mupiModules', icon: IconMonitor },
  { id: 'lateral', labelKey: 'catalog.lateralModules', icon: IconPanelLeft },
  { id: 'antennas', labelKey: 'catalog.antennas', icon: IconAntenna }
]

// =========================================================================
// MAIN COMPONENT
// =========================================================================

export default function CatalogModule() {
  const { t } = useTranslation()
  const api = useApi()

  const [activeTab, setActiveTab] = useState<TabId>('stats')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CatalogStats | null>(null)

  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const data = await api.get('/catalog/stats')
      setStats(data)
    } catch (error) {
      console.error('Error loading catalog stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('catalog.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('catalog.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-colors text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey)}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'stats' && <StatsTab stats={stats} onRefresh={loadStats} />}
      {activeTab === 'packs' && <PacksTab />}
      {activeTab === 'columns' && <ColumnsTab />}
      {activeTab === 'luminaires' && <LuminairesTab />}
      {activeTab === 'electrical' && <ElectricalPanelsTab />}
      {activeTab === 'fuse' && <FuseBoxesTab />}
      {activeTab === 'telemetry' && <TelemetryTab />}
      {activeTab === 'ev' && <EVChargersTab />}
      {activeTab === 'mupi' && <MUPITab />}
      {activeTab === 'lateral' && <LateralTab />}
      {activeTab === 'antennas' && <AntennasTab />}
    </div>
  )
}

// =========================================================================
// STATS TAB
// =========================================================================

function StatsTab({ stats, onRefresh }: { stats: CatalogStats | null; onRefresh: () => void }) {
  const { t } = useTranslation()

  if (!stats) {
    return <div className="text-center py-8 text-gray-500">{t('common.noData')}</div>
  }

  const statCards = [
    { label: t('catalog.columns'), value: stats.total_columns, icon: IconColumns, color: 'blue' },
    { label: t('catalog.luminaires'), value: stats.total_luminaires, icon: IconLightbulb, color: 'yellow' },
    { label: t('catalog.electricalPanels'), value: stats.total_electrical_panels, icon: IconZap, color: 'red' },
    { label: t('catalog.fuseBoxes'), value: stats.total_fuse_boxes, icon: IconBox, color: 'orange' },
    { label: t('catalog.telemetry'), value: stats.total_telemetry, icon: IconRadio, color: 'purple' },
    { label: t('catalog.evChargers'), value: stats.total_ev_chargers, icon: IconCar, color: 'green' },
    { label: t('catalog.mupiModules'), value: stats.total_mupi, icon: IconMonitor, color: 'pink' },
    { label: t('catalog.lateralModules'), value: stats.total_lateral, icon: IconPanelLeft, color: 'indigo' },
    { label: t('catalog.antennas'), value: stats.total_antennas, icon: IconAntenna, color: 'cyan' }
  ]

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30',
    indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30',
    cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30'
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <IconLoader className="w-4 h-4" />
          {t('common.refresh')}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClasses[stat.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* By Pack */}
      {stats.by_pack && stats.by_pack.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">{t('catalog.byPack')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.by_pack.map((p) => (
              <div key={p.pack} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <StatusBadge
                  status={p.pack}
                  colorMap={{
                    BAREBONE: 'gray',
                    CORE: 'blue',
                    ESSENCIAL: 'green',
                    PREMIUM: 'purple'
                  }}
                />
                <span className="font-semibold">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Height */}
      {stats.by_height && stats.by_height.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">{t('catalog.byHeight')}</h3>
          <div className="space-y-2">
            {stats.by_height.map((h) => {
              const total = stats.total_columns || 1
              const pct = (h.count / total) * 100
              return (
                <div key={h.height} className="flex items-center gap-4">
                  <span className="w-16 text-sm text-gray-600 dark:text-gray-400">{h.height}m</span>
                  <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-medium">{h.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// GENERIC CRUD TABLE COMPONENT
// =========================================================================

interface CrudTableProps<T> {
  endpoint: string
  columns: Array<{
    key: keyof T | string
    label: string
    render?: (item: T) => React.ReactNode
    width?: string
  }>
  formFields: Array<{
    name: keyof T | string
    label: string
    type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea'
    options?: Array<{ value: string; label: string }>
    required?: boolean
    placeholder?: string
    step?: string
  }>
  title: string
  searchPlaceholder?: string
  itemName: string
}

function CrudTable<T extends { id: number; active?: number }>({
  endpoint,
  columns,
  formFields,
  title,
  searchPlaceholder,
  itemName
}: CrudTableProps<T>) {
  const { t } = useTranslation()
  const api = useApi()

  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: T | null }>({ open: false, item: null })
  const [saving, setSaving] = useState(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const data = await api.get(`${endpoint}${params}`)
      setItems(data.items || [])
    } catch (error) {
      console.error(`Error loading ${endpoint}:`, error)
    } finally {
      setLoading(false)
    }
  }, [api, endpoint, search])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleAdd = () => {
    setEditingItem(null)
    const initialData: Record<string, any> = {}
    formFields.forEach(f => {
      if (f.type === 'checkbox') initialData[f.name as string] = false
      else if (f.type === 'number') initialData[f.name as string] = 0
      else initialData[f.name as string] = ''
    })
    setFormData(initialData)
    setShowForm(true)
  }

  const handleEdit = (item: T) => {
    setEditingItem(item)
    const data: Record<string, any> = {}
    formFields.forEach(f => {
      const key = f.name as keyof T
      if (f.type === 'checkbox') data[f.name as string] = Boolean((item as any)[key])
      else data[f.name as string] = (item as any)[key] ?? ''
    })
    setFormData(data)
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingItem) {
        await api.put(`${endpoint}/${editingItem.id}`, formData)
      } else {
        await api.post(endpoint, formData)
      }
      setShowForm(false)
      setEditingItem(null)
      loadItems()
    } catch (error: any) {
      alert(error.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.item) return
    try {
      await api.delete(`${endpoint}/${deleteDialog.item.id}`)
      setDeleteDialog({ open: false, item: null })
      loadItems()
    } catch (error: any) {
      alert(error.message || t('common.error'))
    }
  }

  const filteredItems = items.filter((item: any) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return columns.some(col => {
      const value = (item as any)[col.key]
      if (value == null) return false
      return String(value).toLowerCase().includes(searchLower)
    })
  })

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder || t('common.search')}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <IconPlus className="w-4 h-4" />
          {t('common.add')}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className="px-4 py-3 text-left text-sm font-medium"
                    style={{ width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-sm font-medium w-24">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center">
                    <IconLoader className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500">
                    {t('common.noResults')}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-4 py-3 text-sm">
                        {col.render ? col.render(item) : String((item as any)[col.key] ?? '-')}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                          title={t('common.edit')}
                        >
                          <IconEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ open: true, item })}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title={t('common.delete')}
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingItem ? t('common.edit') : t('common.add')} {itemName}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formFields.map((field) => (
                <FormField
                  key={String(field.name)}
                  name={String(field.name)}
                  label={field.label}
                  type={field.type}
                  value={formData[field.name as string]}
                  onChange={(value) => setFormData(prev => ({ ...prev, [field.name as string]: value }))}
                  options={field.options}
                  required={field.required}
                  placeholder={field.placeholder}
                />
              ))}
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <IconLoader className="w-4 h-4 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <IconSave className="w-4 h-4" />
                    {t('common.save')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        title={`${t('common.delete')} ${itemName}`}
        message={t('confirmations.delete')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
      />
    </div>
  )
}

// =========================================================================
// PACKS TAB
// =========================================================================

function PacksTab() {
  const { t } = useTranslation()

  return (
    <CrudTable<CatalogPack>
      endpoint="/catalog/packs"
      title={t('catalogModule.packs')}
      itemName={t('catalogModule.pack')}
      searchPlaceholder={t('catalog.searchPlaceholder')}
      columns={[
        { key: 'name', label: t('common.name'), render: (item) => (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || '#6B7280' }} />
            <span className="font-medium">{item.name}</span>
          </div>
        )},
        { key: 'description', label: t('common.description') },
        { key: 'active', label: t('common.status'), width: '100px', render: (item) => (
          <StatusBadge status={item.active ? 'active' : 'inactive'} colorMap={{ active: 'green', inactive: 'gray' }} />
        )}
      ]}
      formFields={[
        { name: 'name', label: t('common.name'), type: 'text', required: true },
        { name: 'description', label: t('common.description'), type: 'textarea' },
        { name: 'color', label: t('catalog.color'), type: 'text', placeholder: '#3B82F6' },
        { name: 'active', label: t('common.active'), type: 'checkbox' }
      ]}
    />
  )
}

// =========================================================================
// COLUMNS TAB (Postes)
// =========================================================================

function ColumnsTab() {
  const { t } = useTranslation()

  const moduleLabels = [
    { key: 'mod1', label: 'L', title: t('catalog.moduleLuminaire') },
    { key: 'mod2', label: 'QE', title: t('catalog.moduleElectrical') },
    { key: 'mod3', label: 'CF', title: t('catalog.moduleFuseBox') },
    { key: 'mod4', label: 'T', title: t('catalog.moduleTelemetry') },
    { key: 'mod5', label: 'EV', title: t('catalog.moduleEV') },
    { key: 'mod6', label: 'M', title: t('catalog.moduleMUPI') },
    { key: 'mod7', label: 'LA', title: t('catalog.moduleLateral') },
    { key: 'mod8', label: 'AN', title: t('catalog.moduleAntenna') }
  ]

  return (
    <CrudTable<CatalogColumn>
      endpoint="/catalog/columns"
      title={t('catalog.columns')}
      itemName={t('catalog.column')}
      searchPlaceholder={t('catalog.searchPlaceholder')}
      columns={[
        { key: 'reference', label: t('catalog.reference'), render: (item) => (
          <span className="font-mono font-medium text-blue-600">{item.reference}</span>
        )},
        { key: 'pack', label: t('catalog.pack'), width: '100px', render: (item) => (
          <StatusBadge
            status={item.pack}
            colorMap={{ BAREBONE: 'gray', CORE: 'blue', ESSENCIAL: 'green', PREMIUM: 'purple' }}
          />
        )},
        { key: 'height_m', label: t('catalog.height'), width: '80px', render: (item) => `${item.height_m}m` },
        { key: 'arm_count', label: t('catalog.arms'), width: '80px' },
        { key: 'modules', label: t('catalog.modules'), render: (item) => (
          <div className="flex flex-wrap gap-1">
            {moduleLabels.map(m => (
              (item as any)[m.key] ? (
                <span
                  key={m.key}
                  title={m.title}
                  className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded"
                >
                  {m.label}
                </span>
              ) : null
            ))}
          </div>
        )},
        { key: 'active', label: t('common.status'), width: '80px', render: (item) => (
          <StatusBadge status={item.active ? 'active' : 'inactive'} colorMap={{ active: 'green', inactive: 'gray' }} />
        )}
      ]}
      formFields={[
        { name: 'reference', label: t('catalog.reference'), type: 'text', required: true },
        { name: 'description', label: t('common.description'), type: 'textarea' },
        { name: 'pack', label: t('catalog.pack'), type: 'select', required: true, options: [
          { value: 'BAREBONE', label: 'BAREBONE' },
          { value: 'CORE', label: 'CORE' },
          { value: 'ESSENCIAL', label: 'ESSENCIAL' },
          { value: 'PREMIUM', label: 'PREMIUM' }
        ]},
        { name: 'height_m', label: t('catalog.height') + ' (m)', type: 'number' },
        { name: 'arm_count', label: t('catalog.armCount'), type: 'number' },
        { name: 'mod1', label: t('catalog.moduleLuminaire'), type: 'checkbox' },
        { name: 'mod2', label: t('catalog.moduleElectrical'), type: 'checkbox' },
        { name: 'mod3', label: t('catalog.moduleFuseBox'), type: 'checkbox' },
        { name: 'mod4', label: t('catalog.moduleTelemetry'), type: 'checkbox' },
        { name: 'mod5', label: t('catalog.moduleEV'), type: 'checkbox' },
        { name: 'mod6', label: t('catalog.moduleMUPI'), type: 'checkbox' },
        { name: 'mod7', label: t('catalog.moduleLateral'), type: 'checkbox' },
        { name: 'mod8', label: t('catalog.moduleAntenna'), type: 'checkbox' },
        { name: 'active', label: t('common.active'), type: 'checkbox' }
      ]}
    />
  )
}

// =========================================================================
// LUMINAIRES TAB
// =========================================================================

function LuminairesTab() {
  const { t } = useTranslation()

  return (
    <CrudTable<CatalogLuminaire>
      endpoint="/catalog/luminaires"
      title={t('catalog.luminaires')}
      itemName={t('catalog.luminaire')}
      searchPlaceholder={t('catalog.searchPlaceholder')}
      columns={[
        { key: 'reference', label: t('catalog.reference'), render: (item) => (
          <span className="font-mono font-medium text-blue-600">{item.reference}</span>
        )},
        { key: 'manufacturer', label: t('catalog.manufacturer') },
        { key: 'power_w', label: t('catalog.power'), width: '80px', render: (item) => `${item.power_w}W` },
        { key: 'lumens', label: t('catalog.lumens'), width: '100px', render: (item) => `${item.lumens} lm` },
        { key: 'color_temp_k', label: t('catalog.colorTemp'), width: '80px', render: (item) => `${item.color_temp_k}K` },
        { key: 'ip_rating', label: 'IP', width: '60px' },
        { key: 'dimmable', label: t('catalog.dimmable'), width: '80px', render: (item) => (
          item.dimmable ? <IconCheckCircle className="w-4 h-4 text-green-600" /> : <IconXCircle className="w-4 h-4 text-gray-400" />
        )},
        { key: 'active', label: t('common.status'), width: '80px', render: (item) => (
          <StatusBadge status={item.active ? 'active' : 'inactive'} colorMap={{ active: 'green', inactive: 'gray' }} />
        )}
      ]}
      formFields={[
        { name: 'reference', label: t('catalog.reference'), type: 'text', required: true },
        { name: 'description', label: t('common.description'), type: 'textarea' },
        { name: 'manufacturer', label: t('catalog.manufacturer'), type: 'text' },
        { name: 'power_w', label: t('catalog.power') + ' (W)', type: 'number' },
        { name: 'lumens', label: t('catalog.lumens'), type: 'number' },
        { name: 'color_temp_k', label: t('catalog.colorTemp') + ' (K)', type: 'number' },
        { name: 'ip_rating', label: t('catalog.ipRating'), type: 'text', placeholder: 'IP65' },
        { name: 'dimmable', label: t('catalog.dimmable'), type: 'checkbox' },
        { name: 'active', label: t('common.active'), type: 'checkbox' }
      ]}
    />
  )
}

// =========================================================================
// ELECTRICAL PANELS TAB
// =========================================================================

function ElectricalPanelsTab() {
  const { t } = useTranslation()

  return (
    <CrudTable<CatalogElectricalPanel>
      endpoint="/catalog/electrical-panels"
      title={t('catalog.electricalPanels')}
      itemName={t('catalog.electricalPanel')}
      searchPlaceholder={t('catalog.searchPlaceholder')}
      columns={[
        { key: 'reference', label: t('catalog.reference'), render: (item) => (
          <span className="font-mono font-medium text-blue-600">{item.reference}</span>
        )},
        { key: 'manufacturer', label: t('catalog.manufacturer') },
        { key: 'max_power_total', label: t('catalog.maxPower'), width: '100px', render: (item) => `${item.max_power_total}W` },
        { key: 'phases', label: t('catalog.phases'), width: '80px', render: (item) => (
          <span className={item.phases === 3 ? 'text-orange-600 font-medium' : ''}>
            {item.phases === 3 ? t('catalog.threephase') : t('catalog.singlephase')}
          </span>
        )},
        { key: 'voltage', label: t('catalog.voltage'), width: '80px' },
        { key: 'active', label: t('common.status'), width: '80px', render: (item) => (
          <StatusBadge status={item.active ? 'active' : 'inactive'} colorMap={{ active: 'green', inactive: 'gray' }} />
        )}
      ]}
      formFields={[
        { name: 'reference', label: t('catalog.reference'), type: 'text', required: true },
        { name: 'description', label: t('common.description'), type: 'textarea' },
        { name: 'manufacturer', label: t('catalog.manufacturer'), type: 'text' },
        { name: 'max_power_total', label: t('catalog.maxPowerTotal') + ' (W)', type: 'number' },
        { name: 'max_power_per_phase', label: t('catalog.maxPowerPerPhase') + ' (W)', type: 'number' },
        { name: 'phases', label: t('catalog.phases'), type: 'select', options: [
          { value: '1', label: t('catalog.singlephase') },
          { value: '3', label: t('catalog.threephase') }
        ]},
        { name: 'voltage', label: t('catalog.voltage'), type: 'text', placeholder: '230V' },
        { name: 'active', label: t('common.active'), type: 'checkbox' }
      ]}
    />
  )
}

// =========================================================================
// FUSE BOXES TAB
// =========================================================================

function FuseBoxesTab() {
  const { t } = useTranslation()

  return (
    <CrudTable<CatalogFuseBox>
      endpoint="/catalog/fuse-boxes"
      title={t('catalog.fuseBoxes')}
      itemName={t('catalog.fuseBox')}
      searchPlaceholder={t('catalog.searchPlaceholder')}
      columns={[
        { key: 'reference', label: t('catalog.reference'), render: (item) => (
          <span className="font-mono font-medium text-blue-600">{item.reference}</span>
        )},
        { key: 'manufacturer', label: t('catalog.manufacturer') },
        { key: 'max_power', label: t('catalog.maxPower'), width: '100px', render: (item) => `${item.max_power}W` },
        { key: 'fuse_count', label: t('catalog.fuseCount'), width: '100px' },
        { key: 'active', label: t('common.status'), width: '80px', render: (item) => (
          <StatusBadge status={item.active ? 'active' : 'inactive'} colorMap={{ active: 'green', inactive: 'gray' }} />
        )}
      ]}
      formFields={[
        { name: 'reference', label: t('catalog.reference'), type: 'text', required: true },
        { name: 'description', label: t('common.description'), type: 'textarea' },
        { name: 'manufacturer', label: t('catalog.manufacturer'), type: 'text' },
        { name: 'max_power', label: t('catalog.maxPower') + ' (W)', type: 'number' },
        { name: 'fuse_count', label: t('catalog.fuseCount'), type: 'number' },
        { name: 'active', label: t('common.active'), type: 'checkbox' }
      ]}
    />
  )
}

// =========================================================================
// TELEMETRY TAB
// =========================================================================

function TelemetryTab() {
  const { t } = useTranslation()

  return (
    <CrudTable<CatalogTelemetryPanel>
      endpoint="/catalog/telemetry"
      title={t('catalog.telemetry')}
      itemName={t('catalog.telemetryPanel')}
      searchPlaceholder={t('catalog.searchPlaceholder')}
      columns={[
        { key: 'reference', label: t('catalog.reference'), render: (item) => (
          <span className="font-mono font-medium text-blue-600">{item.reference}</span>
        )},
        { key: 'manufacturer', label: t('catalog.manufacturer') },
        { key: 'power_consumption_w', label: t('catalog.powerConsumption'), width: '100px', render: (item) => `${item.power_consumption_w}W` },
        { key: 'connectivity', label: t('catalog.connectivity'), width: '120px' },
        { key: 'active', label: t('common.status'), width: '80px', render: (item) => (
          <StatusBadge status={item.active ? 'active' : 'inactive'} colorMap={{ active: 'green', inactive: 'gray' }} />
        )}
      ]}
      formFields={[
        { name: 'reference', label: t('catalog.reference'), type: 'text', required: true },
        { name: 'description', label: t('common.description'), type: 'textarea' },
        { name: 'manufacturer', label: t('catalog.manufacturer'), type: 'text' },
        { name: 'power_consumption_w', label: t('catalog.powerConsumption') + ' (W)', type: 'number' },
        { name: 'connectivity', label: t('catalog.connectivity'), type: 'select', options: [
          { value: '4G', label: '4G' },
          { value: '5G', label: '5G' },
          { value: 'LoRa', label: 'LoRa' },
          { value: 'WiFi', label: 'WiFi' },
          { value: 'NB-IoT', label: 'NB-IoT' }
        ]},
        { name: 'features', label: t('catalog.features'), type: 'textarea' },
        { name: 'active', label: t('common.active'), type: 'checkbox' }
      ]}
    />
  )
}

// =========================================================================
// EV CHARGERS TAB
// =========================================================================

function EVChargersTab() {
  const { t } = useTranslation()

  return (
    <CrudTable<CatalogEVCharger>
      endpoint="/catalog/ev-chargers"
      title={t('catalog.evChargers')}
      itemName={t('catalog.evCharger')}
      searchPlaceholder={t('catalog.searchPlaceholder')}
      columns={[
        { key: 'reference', label: t('catalog.reference'), render: (item) => (
          <span className="font-mono font-medium text-blue-600">{item.reference}</span>
        )},
        { key: 'manufacturer', label: t('catalog.manufacturer') },
        { key: 'power_kw', label: t('catalog.power'), width: '80px', render: (item) => `${item.power_kw}kW` },
        { key: 'connector_type', label: t('catalog.connectorType'), width: '100px' },
        { key: 'phases', label: t('catalog.phases'), width: '80px', render: (item) => (
          <span className={item.phases === 3 ? 'text-orange-600 font-medium' : ''}>
            {item.phases === 3 ? t('catalog.threephase') : t('catalog.singlephase')}
          </span>
        )},
        { key: 'active', label: t('common.status'), width: '80px', render: (item) => (
          <StatusBadge status={item.active ? 'active' : 'inactive'} colorMap={{ active: 'green', inactive: 'gray' }} />
        )}
      ]}
      formFields={[
        { name: 'reference', label: t('catalog.reference'), type: 'text', required: true },
        { name: 'description', label: t('common.description'), type: 'textarea' },
        { name: 'manufacturer', label: t('catalog.manufacturer'), type: 'text' },
        { name: 'power_kw', label: t('catalog.power') + ' (kW)', type: 'number' },
        { name: 'connector_type', label: t('catalog.connectorType'), type: 'select', options: [
          { value: 'Type 2', label: 'Type 2' },
          { value: 'CCS', label: 'CCS' },
          { value: 'CHAdeMO', label: 'CHAdeMO' },
          { value: 'Type 1', label: 'Type 1' }
        ]},
        { name: 'phases', label: t('catalog.phases'), type: 'select', options: [
          { value: '1', label: t('catalog.singlephase') },
          { value: '3', label: t('catalog.threephase') }
        ]},
        { name: 'active', label: t('common.active'), type: 'checkbox' }
      ]}
    />
  )
}

// =========================================================================
// MUPI TAB
// =========================================================================

function MUPITab() {
  const { t } = useTranslation()

  return (
    <CrudTable<CatalogMUPI>
      endpoint="/catalog/mupi"
      title={t('catalog.mupiModules')}
      itemName={t('catalog.mupiModule')}
      searchPlaceholder={t('catalog.searchPlaceholder')}
      columns={[
        { key: 'reference', label: t('catalog.reference'), render: (item) => (
          <span className="font-mono font-medium text-blue-600">{item.reference}</span>
        )},
        { key: 'manufacturer', label: t('catalog.manufacturer') },
        { key: 'power_consumption_w', label: t('catalog.powerConsumption'), width: '100px', render: (item) => `${item.power_consumption_w}W` },
        { key: 'screen_size', label: t('catalog.screenSize'), width: '100px' },
        { key: 'digital', label: t('catalog.digital'), width: '80px', render: (item) => (
          item.digital ? <IconCheckCircle className="w-4 h-4 text-green-600" /> : <IconXCircle className="w-4 h-4 text-gray-400" />
        )},
        { key: 'active', label: t('common.status'), width: '80px', render: (item) => (
          <StatusBadge status={item.active ? 'active' : 'inactive'} colorMap={{ active: 'green', inactive: 'gray' }} />
        )}
      ]}
      formFields={[
        { name: 'reference', label: t('catalog.reference'), type: 'text', required: true },
        { name: 'description', label: t('common.description'), type: 'textarea' },
        { name: 'manufacturer', label: t('catalog.manufacturer'), type: 'text' },
        { name: 'power_consumption_w', label: t('catalog.powerConsumption') + ' (W)', type: 'number' },
        { name: 'screen_size', label: t('catalog.screenSize'), type: 'text', placeholder: '55"' },
        { name: 'digital', label: t('catalog.digital'), type: 'checkbox' },
        { name: 'active', label: t('common.active'), type: 'checkbox' }
      ]}
    />
  )
}

// =========================================================================
// LATERAL TAB
// =========================================================================

function LateralTab() {
  const { t } = useTranslation()

  return (
    <CrudTable<CatalogLateral>
      endpoint="/catalog/lateral"
      title={t('catalog.lateralModules')}
      itemName={t('catalog.lateralModule')}
      searchPlaceholder={t('catalog.searchPlaceholder')}
      columns={[
        { key: 'reference', label: t('catalog.reference'), render: (item) => (
          <span className="font-mono font-medium text-blue-600">{item.reference}</span>
        )},
        { key: 'manufacturer', label: t('catalog.manufacturer') },
        { key: 'power_consumption_w', label: t('catalog.powerConsumption'), width: '100px', render: (item) => `${item.power_consumption_w}W` },
        { key: 'module_type', label: t('common.type'), width: '120px' },
        { key: 'active', label: t('common.status'), width: '80px', render: (item) => (
          <StatusBadge status={item.active ? 'active' : 'inactive'} colorMap={{ active: 'green', inactive: 'gray' }} />
        )}
      ]}
      formFields={[
        { name: 'reference', label: t('catalog.reference'), type: 'text', required: true },
        { name: 'description', label: t('common.description'), type: 'textarea' },
        { name: 'manufacturer', label: t('catalog.manufacturer'), type: 'text' },
        { name: 'power_consumption_w', label: t('catalog.powerConsumption') + ' (W)', type: 'number' },
        { name: 'module_type', label: t('common.type'), type: 'select', options: [
          { value: 'Banner', label: 'Banner' },
          { value: 'Display', label: 'Display' },
          { value: 'Sensor', label: 'Sensor' },
          { value: 'Camera', label: 'Camera' },
          { value: 'Other', label: t('common.other') }
        ]},
        { name: 'active', label: t('common.active'), type: 'checkbox' }
      ]}
    />
  )
}

// =========================================================================
// ANTENNAS TAB
// =========================================================================

function AntennasTab() {
  const { t } = useTranslation()

  return (
    <CrudTable<CatalogAntenna>
      endpoint="/catalog/antennas"
      title={t('catalog.antennas')}
      itemName={t('catalog.antenna')}
      searchPlaceholder={t('catalog.searchPlaceholder')}
      columns={[
        { key: 'reference', label: t('catalog.reference'), render: (item) => (
          <span className="font-mono font-medium text-blue-600">{item.reference}</span>
        )},
        { key: 'manufacturer', label: t('catalog.manufacturer') },
        { key: 'power_consumption_w', label: t('catalog.powerConsumption'), width: '100px', render: (item) => `${item.power_consumption_w}W` },
        { key: 'frequency_band', label: t('catalog.frequencyBand'), width: '120px' },
        { key: 'technology', label: t('catalog.technology'), width: '80px' },
        { key: 'active', label: t('common.status'), width: '80px', render: (item) => (
          <StatusBadge status={item.active ? 'active' : 'inactive'} colorMap={{ active: 'green', inactive: 'gray' }} />
        )}
      ]}
      formFields={[
        { name: 'reference', label: t('catalog.reference'), type: 'text', required: true },
        { name: 'description', label: t('common.description'), type: 'textarea' },
        { name: 'manufacturer', label: t('catalog.manufacturer'), type: 'text' },
        { name: 'power_consumption_w', label: t('catalog.powerConsumption') + ' (W)', type: 'number' },
        { name: 'frequency_band', label: t('catalog.frequencyBand'), type: 'text', placeholder: '700-2600 MHz' },
        { name: 'technology', label: t('catalog.technology'), type: 'select', options: [
          { value: '4G', label: '4G LTE' },
          { value: '5G', label: '5G NR' },
          { value: 'WiFi', label: 'WiFi' },
          { value: 'LoRa', label: 'LoRa' },
          { value: 'Other', label: t('common.other') }
        ]},
        { name: 'active', label: t('common.active'), type: 'checkbox' }
      ]}
    />
  )
}
