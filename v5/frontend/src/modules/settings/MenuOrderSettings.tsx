/**
 * SmartLamppost v5.0 - Menu Order Settings
 * Drag and drop interface to reorder sidebar menu items
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import {
  IconSave, IconLoader, IconGripVertical, IconRefresh,
  IconDashboard, IconPackage, IconUsers, IconWrench, IconBookOpen,
  IconHardHat, IconFileText, IconBarChart3, IconSettings, IconDatabase,
  IconBuilding, IconMapPin, IconScanLine, IconFileSpreadsheet
} from '@/components/icons'

interface MenuItem {
  id: string
  icon: string
  default_order: number
  order: number
  fixed_position?: string
}

// Icon map for rendering
const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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

const MenuOrderSettings: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  useEffect(() => {
    loadMenuItems()
  }, [])

  const loadMenuItems = async () => {
    setLoading(true)
    try {
      const data = await api.get('/settings/menu-items')
      // Filter out fixed position items for reordering
      const reorderableItems = (data.items || []).filter(
        (item: MenuItem) => !item.fixed_position
      )
      setMenuItems(reorderableItems)
    } catch (err: any) {
      console.error('Error loading menu items:', err)
      setMessage({ type: 'error', text: err.message || t('common.error') })
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
    // Add drag ghost styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null)
    setDragOverItem(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (itemId !== draggedItem) {
      setDragOverItem(itemId)
    }
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()

    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }

    const newItems = [...menuItems]
    const draggedIndex = newItems.findIndex(item => item.id === draggedItem)
    const targetIndex = newItems.findIndex(item => item.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Remove dragged item and insert at target position
    const [removed] = newItems.splice(draggedIndex, 1)
    newItems.splice(targetIndex, 0, removed)

    // Update order values
    newItems.forEach((item, index) => {
      item.order = index + 1
    })

    setMenuItems(newItems)
    setDraggedItem(null)
    setDragOverItem(null)
  }

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((itemId: string) => {
    setDraggedItem(itemId)
  }, [])

  const handleTouchEnd = useCallback(() => {
    setDraggedItem(null)
    setDragOverItem(null)
  }, [])

  const moveItem = (itemId: string, direction: 'up' | 'down') => {
    const newItems = [...menuItems]
    const index = newItems.findIndex(item => item.id === itemId)

    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === newItems.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const [removed] = newItems.splice(index, 1)
    newItems.splice(targetIndex, 0, removed)

    // Update order values
    newItems.forEach((item, idx) => {
      item.order = idx + 1
    })

    setMenuItems(newItems)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const menuOrder = menuItems.map(item => item.id)
      await api.put('/settings/menu-order', { menu_order: menuOrder })
      setMessage({ type: 'success', text: t('settings.menuOrderSaved') || 'Ordem dos menus guardada com sucesso' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setLoading(true)
    try {
      // Reset to default order
      const newItems = [...menuItems].sort((a, b) => a.default_order - b.default_order)
      newItems.forEach((item, index) => {
        item.order = index + 1
      })
      setMenuItems(newItems)

      // Save empty order to reset to defaults
      await api.put('/settings/menu-order', { menu_order: [] })
      setMessage({ type: 'success', text: t('settings.menuOrderReset') || 'Ordem dos menus reposta aos valores originais' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('common.error') })
    } finally {
      setLoading(false)
    }
  }

  const getMenuLabel = (id: string): string => {
    return t(`navigation.${id}`) || id
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <IconLoader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.menuOrderDescription') || 'Arraste e solte os itens para reorganizar os menus da barra lateral. A nova ordem será aplicada após guardar.'}
        </p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Menu items list */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          {t('settings.menuItems') || 'Itens do Menu'}
        </h3>

        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = iconMap[item.icon] || IconPackage
            const isDragging = draggedItem === item.id
            const isDragOver = dragOverItem === item.id

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id)}
                className={`
                  flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800
                  border-2 transition-all duration-150 cursor-grab active:cursor-grabbing
                  ${isDragging ? 'opacity-50 border-blue-500 shadow-lg' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}
                  ${isDragOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}
                  shadow-sm hover:shadow-md
                `}
              >
                {/* Drag handle */}
                <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-none">
                  <IconGripVertical size={20} />
                </div>

                {/* Order number */}
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300">
                  {item.order}
                </span>

                {/* Icon */}
                <Icon size={20} className="text-slp-navy dark:text-white flex-shrink-0" />

                {/* Label */}
                <span className="flex-1 font-medium text-gray-900 dark:text-white">
                  {getMenuLabel(item.id)}
                </span>

                {/* Up/Down buttons for mobile/accessibility */}
                <div className="flex gap-1">
                  <button
                    onClick={() => moveItem(item.id, 'up')}
                    disabled={menuItems.indexOf(item) === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title={t('common.moveUp') || 'Mover para cima'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveItem(item.id, 'down')}
                    disabled={menuItems.indexOf(item) === menuItems.length - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title={t('common.moveDown') || 'Mover para baixo'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          {t('settings.menuOrderNote') || 'Nota: O menu "Definições" permanece sempre no final da lista.'}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={handleReset}
          disabled={saving}
          className="inline-flex items-center justify-center px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          <IconRefresh className="h-4 w-4 mr-2" />
          {t('settings.resetOrder') || 'Repor Ordem Original'}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <IconLoader className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <IconSave className="h-4 w-4 mr-2" />
          )}
          {t('common.save') || 'Guardar'}
        </button>
      </div>
    </div>
  )
}

export default MenuOrderSettings
