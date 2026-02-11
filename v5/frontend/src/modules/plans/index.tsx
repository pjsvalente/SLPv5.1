/**
 * SmartLamppost v5.0 - Plans Configuration Module
 * Configure which modules are available for each plan (superadmin only)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApi } from '@/hooks/useApi'
import {
  ArrowLeft,
  Save,
  Check,
  X,
  Package,
  Users,
  Wrench,
  BookOpen,
  HardHat,
  FileText,
  BarChart3,
  Settings,
  Database,
  LayoutDashboard,
  Crown,
  Shield,
  Zap,
  Building2
} from 'lucide-react'

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Package,
  Users,
  Wrench,
  BookOpen,
  HardHat,
  FileText,
  BarChart3,
  Settings,
  Database,
  Building2
}

// Plan icons
const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  base: Shield,
  pro: Zap,
  premium: Crown,
  enterprise: Building2
}

// Plan colors
const planColors: Record<string, string> = {
  base: 'bg-gray-100 text-gray-800 border-gray-300',
  pro: 'bg-blue-100 text-blue-800 border-blue-300',
  premium: 'bg-purple-100 text-purple-800 border-purple-300',
  enterprise: 'bg-amber-100 text-amber-800 border-amber-300'
}

interface Plan {
  id: string
  name: string
  description: string
  modules: string[]
  limits: Record<string, number>
  features: Record<string, boolean>
}

interface Module {
  id: string
  name: string
  description: string
  icon: string
}

export default function PlansConfigModule() {
  const navigate = useNavigate()
  const api = useApi()
  const { t } = useTranslation()

  const [plans, setPlans] = useState<Record<string, Plan>>({})
  const [modules, setModules] = useState<Record<string, Module>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/settings/plans')
      setPlans(data.plans || {})
      setModules(data.modules || {})
    } catch (error) {
      console.error('Error loading plans:', error)
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleModule = (planId: string, moduleId: string) => {
    setPlans(prev => {
      const plan = prev[planId]
      if (!plan) return prev

      const currentModules = plan.modules || []
      let newModules: string[]

      // If plan has '*' (all modules), convert to explicit list first
      if (currentModules.includes('*')) {
        newModules = Object.keys(modules).filter(m => m !== moduleId)
      } else if (currentModules.includes(moduleId)) {
        newModules = currentModules.filter(m => m !== moduleId)
      } else {
        newModules = [...currentModules, moduleId]
      }

      return {
        ...prev,
        [planId]: {
          ...plan,
          modules: newModules
        }
      }
    })
    setHasChanges(true)
  }

  const setAllModules = (planId: string) => {
    setPlans(prev => {
      const plan = prev[planId]
      if (!plan) return prev

      return {
        ...prev,
        [planId]: {
          ...plan,
          modules: ['*']
        }
      }
    })
    setHasChanges(true)
  }

  const clearAllModules = (planId: string) => {
    setPlans(prev => {
      const plan = prev[planId]
      if (!plan) return prev

      return {
        ...prev,
        [planId]: {
          ...plan,
          modules: []
        }
      }
    })
    setHasChanges(true)
  }

  const hasModule = (planId: string, moduleId: string): boolean => {
    const plan = plans[planId]
    if (!plan) return false
    if (plan.modules.includes('*')) return true
    return plan.modules.includes(moduleId)
  }

  const savePlan = async (planId: string) => {
    setSaving(true)
    try {
      await api.put(`/settings/plans/${planId}/modules`, {
        modules: plans[planId].modules
      })
      setHasChanges(false)
      alert(t('plans.configSaved'))
    } catch (error: any) {
      alert(error.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const saveAllPlans = async () => {
    setSaving(true)
    try {
      for (const planId of Object.keys(plans)) {
        await api.put(`/settings/plans/${planId}/modules`, {
          modules: plans[planId].modules
        })
      }
      setHasChanges(false)
      alert(t('plans.allConfigsSaved'))
    } catch (error: any) {
      alert(error.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const planOrder = ['base', 'pro', 'premium', 'enterprise']
  const sortedPlans = planOrder.filter(p => plans[p]).map(p => ({ id: p, ...plans[p] }))
  const moduleList = Object.values(modules)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tenants')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('plans.title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t('plans.subtitle')}
            </p>
          </div>
        </div>
        {hasChanges && (
          <button
            onClick={saveAllPlans}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? t('common.saving') : t('plans.saveChanges')}
          </button>
        )}
      </div>

      {/* Plans comparison table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white w-48">
                  {t('plans.module')}
                </th>
                {sortedPlans.map(plan => {
                  const PlanIcon = planIcons[plan.id] || Shield
                  return (
                    <th key={plan.id} className="px-4 py-3 text-center min-w-[140px]">
                      <div className={`inline-flex flex-col items-center gap-1 px-3 py-2 rounded-lg border ${planColors[plan.id]}`}>
                        <PlanIcon className="w-5 h-5" />
                        <span className="font-semibold">{plan.name}</span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {moduleList.map(module => {
                const ModuleIcon = iconMap[module.icon] || Package
                return (
                  <tr key={module.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <ModuleIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{module.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{module.description}</p>
                        </div>
                      </div>
                    </td>
                    {sortedPlans.map(plan => {
                      const isEnabled = hasModule(plan.id, module.id)
                      return (
                        <td key={plan.id} className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleModule(plan.id, module.id)}
                            className={`p-2 rounded-full transition-colors ${
                              isEnabled
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {isEnabled ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {t('plans.quickActions')}
                </td>
                {sortedPlans.map(plan => (
                  <td key={plan.id} className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setAllModules(plan.id)}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        title={t('plans.allModules')}
                      >
                        {t('plans.allModules')}
                      </button>
                      <button
                        onClick={() => clearAllModules(plan.id)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title={t('plans.noModules')}
                      >
                        {t('plans.noModules')}
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Plan limits info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedPlans.map(plan => {
          const PlanIcon = planIcons[plan.id] || Shield
          const limits = plan.limits || {}
          return (
            <div key={plan.id} className={`p-4 rounded-lg border ${planColors[plan.id]}`}>
              <div className="flex items-center gap-2 mb-3">
                <PlanIcon className="w-5 h-5" />
                <h3 className="font-semibold">{plan.name}</h3>
              </div>
              <p className="text-sm opacity-80 mb-3">{plan.description}</p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="opacity-70">{t('plans.limits.users')}:</span>{' '}
                  <span className="font-medium">{limits.max_users === -1 ? t('plans.limits.unlimited') : limits.max_users}</span>
                </p>
                <p>
                  <span className="opacity-70">{t('plans.limits.assets')}:</span>{' '}
                  <span className="font-medium">{limits.max_assets === -1 ? t('plans.limits.unlimited') : limits.max_assets}</span>
                </p>
                <p>
                  <span className="opacity-70">{t('plans.limits.storage')}:</span>{' '}
                  <span className="font-medium">
                    {limits.max_storage_mb === -1 ? t('plans.limits.unlimited') : `${limits.max_storage_mb} MB`}
                  </span>
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Features comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">{t('plans.features')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Funcionalidade</th>
                {sortedPlans.map(plan => (
                  <th key={plan.id} className="px-4 py-2 text-center text-sm font-medium">{plan.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {['2fa', 'api_access', 'export_excel', 'export_pdf', 'custom_branding', 'route_planner', 'analytics', 'priority_support'].map(feature => (
                <tr key={feature}>
                  <td className="px-4 py-2 text-sm capitalize">
                    {feature.replace(/_/g, ' ')}
                  </td>
                  {sortedPlans.map(plan => {
                    const hasFeature = plan.features?.[feature]
                    return (
                      <td key={plan.id} className="px-4 py-2 text-center">
                        {hasFeature ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-gray-300 mx-auto" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
