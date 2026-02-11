/**
 * SmartLamppost v5.0 - Reference Configurator
 * 3-step wizard for configuring asset references from catalog:
 * 1. Select Column (Pack → Reference)
 * 2. Select Compatible Modules
 * 3. Summary with Electrical Balance
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useApi } from '@/hooks/useApi'
import { StatusBadge } from '@/components/ui'
import {
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Columns,
  Lightbulb,
  Box,
  Radio,
  Car,
  Monitor,
  PanelLeft,
  Antenna,
  Package,
  RefreshCw,
  Calculator,
  ArrowRight
} from 'lucide-react'

// =========================================================================
// TYPES
// =========================================================================

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
}

interface CatalogModule {
  id: number
  reference: string
  description: string
  manufacturer?: string
  power_w?: number
  power_kw?: number
  power_consumption_w?: number
  max_power?: number
  max_power_total?: number
}

interface CompatibleModules {
  luminaires: CatalogModule[]
  electrical_panels: CatalogModule[]
  fuse_boxes: CatalogModule[]
  telemetry: CatalogModule[]
  ev_chargers: CatalogModule[]
  mupi: CatalogModule[]
  lateral: CatalogModule[]
  antennas: CatalogModule[]
}

interface SelectedModules {
  luminaire_id: number | null
  electrical_panel_id: number | null
  fuse_box_id: number | null
  telemetry_id: number | null
  ev_charger_id: number | null
  mupi_id: number | null
  lateral_id: number | null
  antenna_id: number | null
}

interface PowerCalculation {
  max_power: number
  installed_power: number
  remaining_power: number
  connection_type: string
  power_source: string
  is_valid: boolean
  modules: Array<{ name: string; power: number }>
}

interface ConfigurationResult {
  column_reference: string
  column_id: number
  pack: string
  height_m: number
  modules: SelectedModules
  power_calculation: PowerCalculation
}

interface ReferenceConfiguratorProps {
  onComplete: (result: ConfigurationResult) => void
  onCancel: () => void
  initialColumn?: number
}

// =========================================================================
// MAIN COMPONENT
// =========================================================================

export function ReferenceConfigurator({ onComplete, onCancel, initialColumn }: ReferenceConfiguratorProps) {
  const { t } = useTranslation()
  const api = useApi()

  // State
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1: Column selection
  const [columns, setColumns] = useState<CatalogColumn[]>([])
  const [selectedPack, setSelectedPack] = useState<string>('')
  const [selectedColumn, setSelectedColumn] = useState<CatalogColumn | null>(null)

  // Step 2: Module selection
  const [compatibleModules, setCompatibleModules] = useState<CompatibleModules | null>(null)
  const [selectedModules, setSelectedModules] = useState<SelectedModules>({
    luminaire_id: null,
    electrical_panel_id: null,
    fuse_box_id: null,
    telemetry_id: null,
    ev_charger_id: null,
    mupi_id: null,
    lateral_id: null,
    antenna_id: null
  })

  // Step 3: Power calculation
  const [powerCalc, setPowerCalc] = useState<PowerCalculation | null>(null)

  // Available packs
  const packs = Array.from(new Set(columns.map(c => c.pack))).sort()

  // Load columns on mount
  useEffect(() => {
    loadColumns()
  }, [])

  // Load initial column if provided
  useEffect(() => {
    if (initialColumn && columns.length > 0) {
      const col = columns.find(c => c.id === initialColumn)
      if (col) {
        setSelectedPack(col.pack)
        setSelectedColumn(col)
      }
    }
  }, [initialColumn, columns])

  // Load compatible modules when column is selected
  useEffect(() => {
    if (selectedColumn) {
      loadCompatibleModules(selectedColumn.id)
    }
  }, [selectedColumn])

  // Calculate power when modules change (step 3)
  useEffect(() => {
    if (step === 3 && (selectedModules.electrical_panel_id || selectedModules.fuse_box_id)) {
      calculatePower()
    }
  }, [step, selectedModules])

  const loadColumns = async () => {
    setLoading(true)
    try {
      const data = await api.get('/catalog/columns')
      setColumns(data.items || [])
    } catch (error) {
      console.error('Error loading columns:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCompatibleModules = async (columnId: number) => {
    setLoading(true)
    try {
      const data = await api.get(`/catalog/compatible-modules/${columnId}`)
      setCompatibleModules(data)
    } catch (error) {
      console.error('Error loading compatible modules:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculatePower = async () => {
    try {
      const data = await api.post('/catalog/calculate-power', selectedModules)
      setPowerCalc(data)
    } catch (error) {
      console.error('Error calculating power:', error)
    }
  }

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    }
  }

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleComplete = () => {
    if (!selectedColumn || !powerCalc) return

    onComplete({
      column_reference: selectedColumn.reference,
      column_id: selectedColumn.id,
      pack: selectedColumn.pack,
      height_m: selectedColumn.height_m,
      modules: selectedModules,
      power_calculation: powerCalc
    })
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedColumn !== null
      case 2:
        // At least one module or power source must be selected
        return selectedModules.electrical_panel_id !== null || selectedModules.fuse_box_id !== null
      case 3:
        return powerCalc !== null && powerCalc.is_valid
      default:
        return false
    }
  }

  // Filtered columns by selected pack
  const filteredColumns = selectedPack
    ? columns.filter(c => c.pack === selectedPack)
    : columns

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t('configurator.title', 'Reference Configurator')}</h2>
            <p className="text-sm text-gray-500">{t('configurator.subtitle', 'Configure your lamppost reference')}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  s < step ? 'bg-green-500 border-green-500 text-white' :
                  s === step ? 'border-blue-500 text-blue-500' :
                  'border-gray-300 text-gray-300'
                }`}>
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  s === step ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {s === 1 && t('configurator.step1', 'Select Column')}
                  {s === 2 && t('configurator.step2', 'Select Modules')}
                  {s === 3 && t('configurator.step3', 'Summary')}
                </span>
                {s < 3 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    s < step ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {step === 1 && (
                <Step1SelectColumn
                  packs={packs}
                  columns={filteredColumns}
                  selectedPack={selectedPack}
                  selectedColumn={selectedColumn}
                  onPackChange={setSelectedPack}
                  onColumnChange={setSelectedColumn}
                />
              )}
              {step === 2 && compatibleModules && (
                <Step2SelectModules
                  column={selectedColumn!}
                  compatibleModules={compatibleModules}
                  selectedModules={selectedModules}
                  onModulesChange={setSelectedModules}
                />
              )}
              {step === 3 && (
                <Step3Summary
                  column={selectedColumn!}
                  selectedModules={selectedModules}
                  compatibleModules={compatibleModules!}
                  powerCalc={powerCalc}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={step === 1 ? onCancel : handlePrevious}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? t('common.cancel') : t('common.back')}
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {t('common.next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {t('configurator.apply', 'Apply Configuration')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// STEP 1: SELECT COLUMN
// =========================================================================

interface Step1Props {
  packs: string[]
  columns: CatalogColumn[]
  selectedPack: string
  selectedColumn: CatalogColumn | null
  onPackChange: (pack: string) => void
  onColumnChange: (column: CatalogColumn | null) => void
}

function Step1SelectColumn({
  packs,
  columns,
  selectedPack,
  selectedColumn,
  onPackChange,
  onColumnChange
}: Step1Props) {
  const { t } = useTranslation()

  const moduleLabels = [
    { key: 'mod1', icon: Lightbulb, label: t('catalog.moduleLuminaire') },
    { key: 'mod2', icon: Zap, label: t('catalog.moduleElectrical') },
    { key: 'mod3', icon: Box, label: t('catalog.moduleFuseBox') },
    { key: 'mod4', icon: Radio, label: t('catalog.moduleTelemetry') },
    { key: 'mod5', icon: Car, label: t('catalog.moduleEV') },
    { key: 'mod6', icon: Monitor, label: t('catalog.moduleMUPI') },
    { key: 'mod7', icon: PanelLeft, label: t('catalog.moduleLateral') },
    { key: 'mod8', icon: Antenna, label: t('catalog.moduleAntenna') }
  ]

  return (
    <div className="space-y-6">
      {/* Pack Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">{t('catalog.pack')}</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onPackChange('')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              selectedPack === ''
                ? 'bg-blue-50 border-blue-500 text-blue-600'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {t('common.all')}
          </button>
          {packs.map(pack => (
            <button
              key={pack}
              onClick={() => onPackChange(pack)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedPack === pack
                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <StatusBadge
                status={pack}
                colorMap={{
                  BAREBONE: 'gray',
                  CORE: 'blue',
                  ESSENCIAL: 'green',
                  PREMIUM: 'purple'
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Column Grid */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('catalog.columns')} ({columns.length})
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
          {columns.map(col => (
            <div
              key={col.id}
              onClick={() => onColumnChange(col)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedColumn?.id === col.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono font-semibold text-blue-600">{col.reference}</p>
                  <p className="text-sm text-gray-500 mt-1">{col.description}</p>
                </div>
                <StatusBadge
                  status={col.pack}
                  colorMap={{
                    BAREBONE: 'gray',
                    CORE: 'blue',
                    ESSENCIAL: 'green',
                    PREMIUM: 'purple'
                  }}
                />
              </div>

              <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                <span>{col.height_m}m</span>
                <span>{col.arm_count} {t('catalog.arms')}</span>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {moduleLabels.map(m => {
                  const isCompatible = (col as any)[m.key]
                  if (!isCompatible) return null
                  const Icon = m.icon
                  return (
                    <span
                      key={m.key}
                      title={m.label}
                      className="p-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded"
                    >
                      <Icon className="w-3 h-3" />
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// STEP 2: SELECT MODULES
// =========================================================================

interface Step2Props {
  column: CatalogColumn
  compatibleModules: CompatibleModules
  selectedModules: SelectedModules
  onModulesChange: (modules: SelectedModules) => void
}

function Step2SelectModules({
  column,
  compatibleModules,
  selectedModules,
  onModulesChange
}: Step2Props) {
  const { t } = useTranslation()

  const moduleCategories = [
    { key: 'electrical_panel_id', data: 'electrical_panels', label: t('catalog.electricalPanels'), icon: Zap, mod: 'mod2', powerKey: 'max_power_total' },
    { key: 'fuse_box_id', data: 'fuse_boxes', label: t('catalog.fuseBoxes'), icon: Box, mod: 'mod3', powerKey: 'max_power' },
    { key: 'luminaire_id', data: 'luminaires', label: t('catalog.luminaires'), icon: Lightbulb, mod: 'mod1', powerKey: 'power_w' },
    { key: 'telemetry_id', data: 'telemetry', label: t('catalog.telemetry'), icon: Radio, mod: 'mod4', powerKey: 'power_consumption_w' },
    { key: 'ev_charger_id', data: 'ev_chargers', label: t('catalog.evChargers'), icon: Car, mod: 'mod5', powerKey: 'power_kw', unit: 'kW' },
    { key: 'mupi_id', data: 'mupi', label: t('catalog.mupiModules'), icon: Monitor, mod: 'mod6', powerKey: 'power_consumption_w' },
    { key: 'lateral_id', data: 'lateral', label: t('catalog.lateralModules'), icon: PanelLeft, mod: 'mod7', powerKey: 'power_consumption_w' },
    { key: 'antenna_id', data: 'antennas', label: t('catalog.antennas'), icon: Antenna, mod: 'mod8', powerKey: 'power_consumption_w' }
  ]

  const handleSelect = (key: keyof SelectedModules, value: number | null) => {
    onModulesChange({
      ...selectedModules,
      [key]: value
    })
  }

  return (
    <div className="space-y-4">
      {/* Selected Column Info */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center gap-3">
          <Columns className="w-5 h-5 text-blue-600" />
          <div>
            <span className="font-mono font-semibold">{column.reference}</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-gray-600">{column.height_m}m</span>
            <span className="mx-2 text-gray-400">|</span>
            <StatusBadge status={column.pack} colorMap={{ BAREBONE: 'gray', CORE: 'blue', ESSENCIAL: 'green', PREMIUM: 'purple' }} />
          </div>
        </div>
      </div>

      {/* Module Categories */}
      <div className="space-y-4">
        {moduleCategories.map(cat => {
          const isCompatible = (column as any)[cat.mod]
          const modules = (compatibleModules as any)[cat.data] || []
          const Icon = cat.icon
          const selectedId = (selectedModules as any)[cat.key]

          if (!isCompatible) return null

          return (
            <div key={cat.key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-600" />
                <span className="font-medium">{cat.label}</span>
                {modules.length === 0 && (
                  <span className="text-sm text-gray-400 ml-2">({t('common.noData')})</span>
                )}
              </div>

              {modules.length > 0 && (
                <div className="p-3 max-h-40 overflow-y-auto">
                  <div className="space-y-2">
                    <label
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedId === null ? 'bg-gray-100 dark:bg-gray-600' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={cat.key}
                        checked={selectedId === null}
                        onChange={() => handleSelect(cat.key as keyof SelectedModules, null)}
                        className="text-blue-600"
                      />
                      <span className="text-gray-500">{t('common.none')}</span>
                    </label>
                    {modules.map((mod: CatalogModule) => {
                      const power = (mod as any)[cat.powerKey] || 0
                      const unit = cat.unit || 'W'
                      return (
                        <label
                          key={mod.id}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            selectedId === mod.id ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-500' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name={cat.key}
                            checked={selectedId === mod.id}
                            onChange={() => handleSelect(cat.key as keyof SelectedModules, mod.id)}
                            className="text-blue-600"
                          />
                          <div className="flex-1">
                            <span className="font-mono text-sm">{mod.reference}</span>
                            {mod.manufacturer && (
                              <span className="text-gray-400 text-sm ml-2">({mod.manufacturer})</span>
                            )}
                          </div>
                          {power > 0 && (
                            <span className="text-sm text-gray-500">{power}{unit}</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Warning if no power source */}
      {!selectedModules.electrical_panel_id && !selectedModules.fuse_box_id && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">{t('configurator.selectPowerSource', 'Select an Electrical Panel or Fuse Box as power source')}</span>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// STEP 3: SUMMARY
// =========================================================================

interface Step3Props {
  column: CatalogColumn
  selectedModules: SelectedModules
  compatibleModules: CompatibleModules
  powerCalc: PowerCalculation | null
}

function Step3Summary({
  column,
  selectedModules,
  compatibleModules,
  powerCalc
}: Step3Props) {
  const { t } = useTranslation()

  const getModuleReference = (key: string, dataKey: string): string | null => {
    const id = (selectedModules as any)[key]
    if (!id) return null
    const modules = (compatibleModules as any)[dataKey] || []
    const mod = modules.find((m: CatalogModule) => m.id === id)
    return mod?.reference || null
  }

  const selectedItems = [
    { label: t('catalog.luminaire'), ref: getModuleReference('luminaire_id', 'luminaires'), icon: Lightbulb },
    { label: t('catalog.electricalPanel'), ref: getModuleReference('electrical_panel_id', 'electrical_panels'), icon: Zap },
    { label: t('catalog.fuseBox'), ref: getModuleReference('fuse_box_id', 'fuse_boxes'), icon: Box },
    { label: t('catalog.telemetryPanel'), ref: getModuleReference('telemetry_id', 'telemetry'), icon: Radio },
    { label: t('catalog.evCharger'), ref: getModuleReference('ev_charger_id', 'ev_chargers'), icon: Car },
    { label: t('catalog.mupiModule'), ref: getModuleReference('mupi_id', 'mupi'), icon: Monitor },
    { label: t('catalog.lateralModule'), ref: getModuleReference('lateral_id', 'lateral'), icon: PanelLeft },
    { label: t('catalog.antenna'), ref: getModuleReference('antenna_id', 'antennas'), icon: Antenna }
  ].filter(item => item.ref)

  return (
    <div className="space-y-6">
      {/* Column Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-center gap-3">
          <Columns className="w-6 h-6 text-blue-600" />
          <div>
            <p className="font-mono text-lg font-semibold">{column.reference}</p>
            <p className="text-sm text-gray-600">
              {column.description} • {column.height_m}m • {column.arm_count} {t('catalog.arms')}
            </p>
          </div>
          <StatusBadge
            status={column.pack}
            colorMap={{ BAREBONE: 'gray', CORE: 'blue', ESSENCIAL: 'green', PREMIUM: 'purple' }}
          />
        </div>
      </div>

      {/* Selected Modules */}
      <div>
        <h3 className="text-sm font-medium mb-3">{t('configurator.selectedModules', 'Selected Modules')}</h3>
        <div className="space-y-2">
          {selectedItems.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('configurator.noModulesSelected', 'No modules selected')}</p>
          ) : (
            selectedItems.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <Icon className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600">{item.label}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="font-mono font-medium">{item.ref}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Power Calculation */}
      {powerCalc && (
        <div className={`p-4 rounded-lg border-2 ${
          powerCalc.is_valid
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : 'border-red-500 bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5" />
            <h3 className="font-medium">{t('configurator.electricalBalance', 'Electrical Balance')}</h3>
            {powerCalc.is_valid ? (
              <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 ml-auto" />
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">{t('configurator.maxPower', 'Max Power')}</p>
              <p className="text-2xl font-bold">{powerCalc.max_power}W</p>
              <p className="text-xs text-gray-500">{powerCalc.power_source}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('configurator.installedPower', 'Installed')}</p>
              <p className="text-2xl font-bold">{powerCalc.installed_power}W</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('configurator.remainingPower', 'Remaining')}</p>
              <p className={`text-2xl font-bold ${powerCalc.remaining_power < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {powerCalc.remaining_power}W
              </p>
            </div>
          </div>

          {powerCalc.connection_type && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <span className="text-sm text-gray-600">{t('catalog.phases')}: </span>
              <span className="font-medium">{powerCalc.connection_type}</span>
            </div>
          )}

          {!powerCalc.is_valid && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">{t('configurator.powerExceeded', 'Installed power exceeds maximum capacity!')}</span>
            </div>
          )}

          {/* Module power breakdown */}
          {powerCalc.modules && powerCalc.modules.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 mb-2">{t('configurator.powerBreakdown', 'Power Breakdown')}:</p>
              <div className="space-y-1">
                {powerCalc.modules.map((m, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{m.name}</span>
                    <span className="font-mono">{m.power}W</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ReferenceConfigurator
