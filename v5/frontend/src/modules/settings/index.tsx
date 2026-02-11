import React, { useState, useEffect, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { FormField } from '@/components/ui/FormField'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  IconSave, IconLoader, IconPlus, IconTrash, IconSettings, IconHash, IconPalette,
  IconDatabase, IconLayout, IconBookOpen, IconHardDrive, IconFileText, IconBell, IconShield, IconStar, IconGradientDefs
} from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'

// Lazy load components
const FieldCatalog = lazy(() => import('./FieldCatalog'))
const FieldConfig = lazy(() => import('./FieldConfig'))
const BackupSettings = lazy(() => import('./BackupSettings'))
const AuditLog = lazy(() => import('./AuditLog'))
const NotificationSettings = lazy(() => import('./NotificationSettings'))
const PrivacySettings = lazy(() => import('./PrivacySettings'))
const FavoritesSettings = lazy(() => import('./FavoritesSettings'))

// Tab component
const Tab: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({
  active, onClick, icon, label
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
      active
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    {icon}
    {label}
  </button>
)

// Prefixes Settings
const PrefixSettings: React.FC = () => {
  const { t } = useTranslation()
  const [prefixes, setPrefixes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadPrefixes()
  }, [])

  const loadPrefixes = async () => {
    try {
      const data = await api.get('/settings/prefixes')
      setPrefixes(data)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/settings/prefixes', prefixes)
      setMessage({ type: 'success', text: t('settings.saved') })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    setPrefixes(prev => ({ ...prev, [key]: value }))
  }

  if (loading) return <div className="flex justify-center p-8"><IconLoader className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        {t('settings.prefixesDescription')}
      </p>

      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label={t('settings.assetPrefix')}
          name="assets"
          type="text"
          value={prefixes.assets || ''}
          onChange={(v) => handleChange('assets', String(v))}
          helpText="Ex: SLP"
        />
        <FormField
          label={t('settings.assetDigits')}
          name="assets_digits"
          type="number"
          value={prefixes.assets_digits || ''}
          onChange={(v) => handleChange('assets_digits', String(v))}
          helpText={`${t('settings.digits')} (ex: 9)`}
        />
        <FormField
          label={t('settings.preventivePrefix')}
          name="int_preventiva"
          type="text"
          value={prefixes.int_preventiva || ''}
          onChange={(v) => handleChange('int_preventiva', String(v))}
        />
        <FormField
          label={t('settings.correctivePrefix')}
          name="int_corretiva"
          type="text"
          value={prefixes.int_corretiva || ''}
          onChange={(v) => handleChange('int_corretiva', String(v))}
        />
        <FormField
          label={t('settings.replacementPrefix')}
          name="int_substituicao"
          type="text"
          value={prefixes.int_substituicao || ''}
          onChange={(v) => handleChange('int_substituicao', String(v))}
        />
        <FormField
          label={t('settings.inspectionPrefix')}
          name="int_inspecao"
          type="text"
          value={prefixes.int_inspecao || ''}
          onChange={(v) => handleChange('int_inspecao', String(v))}
        />
        <FormField
          label={t('settings.interventionDigits')}
          name="int_digits"
          type="number"
          value={prefixes.int_digits || ''}
          onChange={(v) => handleChange('int_digits', String(v))}
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <IconLoader className="h-4 w-4 mr-2 animate-spin" /> : <IconSave className="h-4 w-4 mr-2" />}
          {t('common.save')}
        </button>
      </div>
    </div>
  )
}

// Colors Settings
const ColorSettings: React.FC = () => {
  const { t } = useTranslation()
  const [colors, setColors] = useState<string[]>([])
  const [newColor, setNewColor] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadColors()
  }, [])

  const loadColors = async () => {
    try {
      const data = await api.get('/settings/colors')
      setColors(data.colors || [])
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/settings/colors', { colors })
      setMessage({ type: 'success', text: t('settings.saved') })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = () => {
    if (newColor && !colors.includes(newColor)) {
      setColors([...colors, newColor])
      setNewColor('')
    }
  }

  const handleRemove = (index: number) => {
    setColors(colors.filter((_, i) => i !== index))
  }

  if (loading) return <div className="flex justify-center p-8"><IconLoader className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        {t('settings.colorsDescription')}
      </p>

      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          placeholder={t('settings.newColor')}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <IconPlus className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {colors.map((color, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full"
          >
            <span className="text-sm">{color}</span>
            <button
              onClick={() => handleRemove(index)}
              className="text-gray-400 hover:text-red-500"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <IconLoader className="h-4 w-4 mr-2 animate-spin" /> : <IconSave className="h-4 w-4 mr-2" />}
          {t('common.save')}
        </button>
      </div>
    </div>
  )
}

// Counters Settings
const CounterSettings: React.FC = () => {
  const { t } = useTranslation()
  const [counters, setCounters] = useState<Array<{ counter_type: string; current_value: number }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadCounters()
  }, [])

  const loadCounters = async () => {
    try {
      const data = await api.get('/settings/counters')
      setCounters(data.counters || [])
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (counterType: string, value: number) => {
    setSaving(counterType)
    try {
      await api.put(`/settings/counters/${counterType}`, { value })
      setMessage({ type: 'success', text: t('settings.counterUpdated') })
      loadCounters()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(null)
    }
  }

  const counterLabels: Record<string, string> = {
    assets: t('navigation.assets'),
    int_preventiva: t('settings.preventivePrefix'),
    int_corretiva: t('settings.correctivePrefix'),
    int_substituicao: t('settings.replacementPrefix'),
    int_inspecao: t('settings.inspectionPrefix')
  }

  if (loading) return <div className="flex justify-center p-8"><IconLoader className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        {t('settings.countersDescription')}
      </p>

      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {counters.map((counter) => (
          <div
            key={counter.counter_type}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {counterLabels[counter.counter_type] || counter.counter_type}
              </p>
              <p className="text-sm text-gray-500">{t('settings.next')}: {counter.current_value + 1}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={counter.current_value}
                onChange={(e) => {
                  const updated = counters.map(c =>
                    c.counter_type === counter.counter_type
                      ? { ...c, current_value: parseInt(e.target.value) || 0 }
                      : c
                  )
                  setCounters(updated)
                }}
                className="w-24 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-center"
              />
              <button
                onClick={() => handleUpdate(counter.counter_type, counter.current_value)}
                disabled={saving === counter.counter_type}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving === counter.counter_type ? <IconLoader className="h-4 w-4 animate-spin" /> : t('common.update')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Schema Settings
const SchemaSettings: React.FC = () => {
  const { t } = useTranslation()
  const [fields, setFields] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null)
  const [newField, setNewField] = useState({
    field_name: '',
    field_type: 'text',
    field_label: '',
    required: false,
    field_category: 'other'
  })

  useEffect(() => {
    loadSchema()
  }, [])

  const loadSchema = async () => {
    try {
      const data = await api.get('/settings/schema')
      setFields(data.fields || [])
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    try {
      await api.post('/settings/schema', newField)
      setShowAddDialog(false)
      setNewField({ field_name: '', field_type: 'text', field_label: '', required: false, field_category: 'other' })
      loadSchema()
      setMessage({ type: 'success', text: t('settings.fieldAdded') })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/settings/schema/${id}`)
      setShowDeleteDialog(null)
      loadSchema()
      setMessage({ type: 'success', text: t('settings.fieldDeleted') })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const categoryLabels: Record<string, string> = {
    identification: t('settings.categories.identification'),
    specifications: t('settings.categories.specifications'),
    installation: t('settings.categories.installation'),
    warranty: t('settings.categories.warranty'),
    maintenance: t('settings.categories.maintenance'),
    equipment: t('settings.categories.equipment'),
    other: t('settings.categories.other')
  }

  if (loading) return <div className="flex justify-center p-8"><IconLoader className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.schemaDescription')}
        </p>
        <button
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <IconPlus className="h-4 w-4 mr-2" />
          {t('settings.newField')}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-2">
        {fields.map((field) => (
          <div
            key={field.id}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{field.field_label}</p>
              <p className="text-sm text-gray-500">
                {field.field_name} | {field.field_type} | {categoryLabels[field.field_category] || field.field_category}
                {field.required ? ` | ${t('common.required')}` : ''}
              </p>
            </div>
            <button
              onClick={() => setShowDeleteDialog(field.id)}
              className="p-2 text-gray-400 hover:text-red-500"
            >
              <IconTrash className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{t('settings.newField')}</h3>
            <div className="space-y-4">
              <FormField
                label={t('settings.fieldName')}
                name="field_name"
                value={newField.field_name}
                onChange={(v) => setNewField({ ...newField, field_name: String(v) })}
                required
              />
              <FormField
                label={t('settings.fieldLabel')}
                name="field_label"
                value={newField.field_label}
                onChange={(v) => setNewField({ ...newField, field_label: String(v) })}
                required
              />
              <FormField
                label={t('common.type')}
                name="field_type"
                type="select"
                value={newField.field_type}
                onChange={(v) => setNewField({ ...newField, field_type: String(v) })}
                options={['text', 'number', 'date', 'select', 'textarea']}
              />
              <FormField
                label={t('common.category')}
                name="field_category"
                type="select"
                value={newField.field_category}
                onChange={(v) => setNewField({ ...newField, field_category: String(v) })}
                options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))}
              />
              <FormField
                label={t('common.required')}
                name="required"
                type="checkbox"
                value={newField.required}
                onChange={(v) => setNewField({ ...newField, required: Boolean(v) })}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                {t('common.cancel')}
              </button>
              <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {t('common.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog !== null}
        onClose={() => setShowDeleteDialog(null)}
        onConfirm={() => showDeleteDialog && handleDelete(showDeleteDialog)}
        title={t('settings.deleteField')}
        message={t('settings.deleteFieldConfirm')}
        confirmText={t('common.delete')}
        variant="danger"
      />
    </div>
  )
}

// Main Settings Component
const Settings: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('prefixes')

  const isSuperadmin = user?.role === 'superadmin'

  // Build tabs based on role
  const tabs = [
    { id: 'prefixes', label: t('settings.prefixes'), icon: <IconHash className="h-4 w-4" /> },
    { id: 'favorites', label: t('settings.favorites') || 'Favoritos', icon: <IconStar className="h-4 w-4" /> },
    { id: 'colors', label: t('settings.colors'), icon: <IconPalette className="h-4 w-4" /> },
    { id: 'counters', label: t('settings.counters'), icon: <IconDatabase className="h-4 w-4" /> },
    { id: 'fields', label: t('settings.fieldConfig') || 'Campos', icon: <IconLayout className="h-4 w-4" /> },
    { id: 'notifications', label: t('notifications.title') || 'Notificações', icon: <IconBell className="h-4 w-4" /> },
    { id: 'privacy', label: t('privacy.title') || 'Privacidade', icon: <IconShield className="h-4 w-4" /> },
    { id: 'backup', label: t('backup.title') || 'Backup', icon: <IconHardDrive className="h-4 w-4" /> },
    { id: 'audit', label: t('auditLog.title') || 'Audit Log', icon: <IconFileText className="h-4 w-4" /> },
    { id: 'schema', label: t('settings.schema'), icon: <IconSettings className="h-4 w-4" /> },
  ]

  // Add field catalog tab for superadmin only
  if (isSuperadmin) {
    tabs.splice(4, 0, { id: 'catalog', label: t('settings.fieldCatalog') || 'Catálogo', icon: <IconBookOpen className="h-4 w-4" /> })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                icon={tab.icon}
                label={tab.label}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'prefixes' && <PrefixSettings />}
          {activeTab === 'favorites' && (
            <Suspense fallback={<div className="flex justify-center p-8"><IconLoader className="h-8 w-8 animate-spin" /></div>}>
              <FavoritesSettings />
            </Suspense>
          )}
          {activeTab === 'colors' && <ColorSettings />}
          {activeTab === 'counters' && <CounterSettings />}
          {activeTab === 'fields' && (
            <Suspense fallback={<div className="flex justify-center p-8"><IconLoader className="h-8 w-8 animate-spin" /></div>}>
              <FieldConfig />
            </Suspense>
          )}
          {activeTab === 'catalog' && isSuperadmin && (
            <Suspense fallback={<div className="flex justify-center p-8"><IconLoader className="h-8 w-8 animate-spin" /></div>}>
              <FieldCatalog />
            </Suspense>
          )}
          {activeTab === 'notifications' && (
            <Suspense fallback={<div className="flex justify-center p-8"><IconLoader className="h-8 w-8 animate-spin" /></div>}>
              <NotificationSettings />
            </Suspense>
          )}
          {activeTab === 'privacy' && (
            <Suspense fallback={<div className="flex justify-center p-8"><IconLoader className="h-8 w-8 animate-spin" /></div>}>
              <PrivacySettings />
            </Suspense>
          )}
          {activeTab === 'backup' && (
            <Suspense fallback={<div className="flex justify-center p-8"><IconLoader className="h-8 w-8 animate-spin" /></div>}>
              <BackupSettings />
            </Suspense>
          )}
          {activeTab === 'audit' && (
            <Suspense fallback={<div className="flex justify-center p-8"><IconLoader className="h-8 w-8 animate-spin" /></div>}>
              <AuditLog />
            </Suspense>
          )}
          {activeTab === 'schema' && <SchemaSettings />}
        </div>
      </div>
    </div>
  )
}

export default Settings
