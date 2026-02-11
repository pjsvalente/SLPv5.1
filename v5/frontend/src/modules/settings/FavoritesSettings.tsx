import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { Save, Loader2, Star, Plus, Trash2 } from 'lucide-react'

interface ConfigurableList {
  name: string
  label: string
  values: string[]
  favoriteKey?: string
}

const FavoritesSettings: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Favorites
  const [favorites, setFavorites] = useState<Record<string, string>>({
    manufacturer: '',
    model: '',
    material: '',
    column_color: ''
  })

  // Defaults (date calculations)
  const [defaults, setDefaults] = useState({
    warranty_years: '5',
    inspection_months: '12',
    maintenance_months: '6'
  })

  // Configurable lists
  const [lists, setLists] = useState<Record<string, string[]>>({
    manufacturers: [],
    models: [],
    materials: [],
    colors: []
  })

  const [newValues, setNewValues] = useState<Record<string, string>>({
    manufacturers: '',
    models: '',
    materials: '',
    colors: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load favorites
      const favData = await api.get('/settings/favorites')
      setFavorites(prev => ({ ...prev, ...favData }))

      // Load defaults
      const defaultsData = await api.get('/settings/defaults')
      setDefaults(prev => ({ ...prev, ...defaultsData }))

      // Load configurable lists
      const listsData = await api.get('/settings/lists')
      setLists(prev => ({ ...prev, ...listsData }))
    } catch (err: any) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFavorites = async () => {
    setSaving(true)
    try {
      await api.put('/settings/favorites', favorites)
      setMessage({ type: 'success', text: t('settings.saved') || 'Guardado com sucesso' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDefaults = async () => {
    setSaving(true)
    try {
      await api.put('/settings/defaults', defaults)
      setMessage({ type: 'success', text: t('settings.saved') || 'Guardado com sucesso' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleAddToList = async (listName: string) => {
    const value = newValues[listName]?.trim()
    if (!value) return

    try {
      await api.post(`/settings/lists/${listName}/add`, { value })
      setLists(prev => ({
        ...prev,
        [listName]: [...(prev[listName] || []), value]
      }))
      setNewValues(prev => ({ ...prev, [listName]: '' }))
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const handleRemoveFromList = async (listName: string, index: number) => {
    const newList = lists[listName].filter((_, i) => i !== index)
    try {
      await api.put(`/settings/lists/${listName}`, { values: newList })
      setLists(prev => ({ ...prev, [listName]: newList }))
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const handleSetFavorite = (listName: string, value: string) => {
    const keyMap: Record<string, string> = {
      manufacturers: 'manufacturer',
      models: 'model',
      materials: 'material',
      colors: 'column_color'
    }
    const favKey = keyMap[listName]
    if (favKey) {
      setFavorites(prev => ({
        ...prev,
        [favKey]: prev[favKey] === value ? '' : value
      }))
    }
  }

  const listConfigs: ConfigurableList[] = [
    { name: 'colors', label: t('settings.colors') || 'Cores', values: lists.colors || [], favoriteKey: 'column_color' },
    { name: 'manufacturers', label: t('settings.manufacturers') || 'Fabricantes', values: lists.manufacturers || [], favoriteKey: 'manufacturer' },
    { name: 'models', label: t('settings.models') || 'Modelos', values: lists.models || [], favoriteKey: 'model' },
    { name: 'materials', label: t('settings.materials') || 'Materiais', values: lists.materials || [], favoriteKey: 'material' }
  ]

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Defaults Section */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('settings.defaultDates') || 'Datas Automáticas'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {t('settings.defaultDatesDescription') || 'Configure os períodos automáticos para cálculo de datas de garantia, inspeção e manutenção.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.warrantyYears') || 'Anos de Garantia'}
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={defaults.warranty_years}
              onChange={(e) => setDefaults(prev => ({ ...prev, warranty_years: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.inspectionMonths') || 'Meses até Inspeção'}
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={defaults.inspection_months}
              onChange={(e) => setDefaults(prev => ({ ...prev, inspection_months: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.maintenanceMonths') || 'Meses até Manutenção'}
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={defaults.maintenance_months}
              onChange={(e) => setDefaults(prev => ({ ...prev, maintenance_months: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveDefaults}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {t('common.save') || 'Guardar'}
          </button>
        </div>
      </div>

      {/* Configurable Lists with Favorites */}
      {listConfigs.map((listConfig) => (
        <div key={listConfig.name} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {listConfig.label}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            {t('settings.listDescription') || 'Clique na estrela para definir o valor favorito (pré-selecionado ao criar ativos).'}
          </p>

          {/* Add new value */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newValues[listConfig.name] || ''}
              onChange={(e) => setNewValues(prev => ({ ...prev, [listConfig.name]: e.target.value }))}
              placeholder={t('settings.addNew') || 'Adicionar novo...'}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              onKeyPress={(e) => e.key === 'Enter' && handleAddToList(listConfig.name)}
            />
            <button
              onClick={() => handleAddToList(listConfig.name)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* List items */}
          <div className="flex flex-wrap gap-2">
            {listConfig.values.map((value, index) => {
              const isFavorite = listConfig.favoriteKey && favorites[listConfig.favoriteKey] === value
              return (
                <div
                  key={index}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
                    isFavorite
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400'
                      : 'bg-gray-100 dark:bg-gray-600'
                  }`}
                >
                  <button
                    onClick={() => handleSetFavorite(listConfig.name, value)}
                    className={`transition-colors ${
                      isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                    }`}
                    title={isFavorite ? 'Remover favorito' : 'Definir como favorito'}
                  >
                    <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                  <span className="text-sm">{value}</span>
                  <button
                    onClick={() => handleRemoveFromList(listConfig.name, index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
            {listConfig.values.length === 0 && (
              <p className="text-gray-500 text-sm italic">
                {t('settings.noItems') || 'Nenhum item configurado'}
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Save Favorites Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveFavorites}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t('settings.saveFavorites') || 'Guardar Favoritos'}
        </button>
      </div>
    </div>
  )
}

export default FavoritesSettings
