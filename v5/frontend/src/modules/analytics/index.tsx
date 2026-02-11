/**
 * SmartLamppost v5.0 - Analytics & KPIs Dashboard
 * Advanced metrics: MTBF, MTTR, costs, efficiency, and predictive maintenance.
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { LoadingSpinner } from '@/core/common/LoadingSpinner'
import {
  BarChart3, TrendingUp, TrendingDown, Clock, DollarSign,
  Activity, AlertTriangle, Wrench, CheckCircle, XCircle,
  Calendar, Download, RefreshCw, Target, Gauge, Brain,
  Cloud, CloudRain, Sun, Wind, Thermometer, Settings, MapPin
} from 'lucide-react'

interface MLPrediction {
  asset_id: number
  serial_number: string
  product_reference?: string
  status?: string
  risk_score: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  failure_probability: number
  days_until_maintenance: number
  total_interventions: number
  corrective_count: number
  last_intervention?: string
  recommendation: string
}

interface WeatherLocation {
  location: string
  latitude: number
  longitude: number
  temperature: number
  feels_like: number
  humidity: number
  pressure: number
  description: string
  icon: string
  wind_speed: number
  wind_direction: number
  clouds: number
  visibility: number
  rain: number
  snow: number
}

interface WeatherForecast {
  datetime: string
  temperature: number
  feels_like: number
  humidity: number
  description: string
  icon: string
  wind_speed: number
  rain_probability: number
  rain_mm: number
}

interface WeatherAlert {
  type: string
  severity: 'low' | 'medium' | 'high'
  location: string
  message: string
  asset_count: number
  recommendation: string
}

interface WeatherData {
  configured: boolean
  locations?: WeatherLocation[]
  forecast?: WeatherForecast[]
  alerts?: WeatherAlert[]
  maintenance_windows?: Array<{ datetime: string; conditions: string; temperature: number }>
  city?: string
  fetched_at?: string
}

interface KPIData {
  mtbf: {
    value: number
    unit: string
    days: number
    failures: number
    total_assets: number
  }
  mttr: {
    value: number
    unit: string
    repairs_count: number
    total_hours: number
  }
  availability: {
    calculated: number
    current: number
    operational_assets: number
    total_assets: number
    unit: string
  }
  costs: {
    total: number
    cost_per_asset: number
    by_type: Array<{ intervention_type: string; total: number; count: number; average: number }>
    monthly: Array<{ month: string; total: number }>
    currency: string
  }
  efficiency: {
    completion_rate: number
    avg_completion_hours: number
    total_interventions: number
    completed: number
    pending: number
    in_progress: number
    cancelled: number
  }
  interventions_summary: {
    by_type: Array<{ intervention_type: string; count: number }>
    top_assets: Array<{ serial_number: string; intervention_count: number }>
  }
  asset_health: {
    by_status: Array<{ status: string; count: number }>
    warranty_expiring_30d: number
    warranty_expired: number
    maintenance_due_7d: number
  }
  trends: {
    interventions: Array<{ month: string; total: number; corrective: number; preventive: number }>
    costs: Array<{ month: string; total_cost: number }>
  }
}

// KPI Card Component
const KPICard: React.FC<{
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
}> = ({ title, value, subtitle, icon, trend, trendValue, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-sm ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend === 'up' ? <TrendingUp className="h-4 w-4" /> :
             trend === 'down' ? <TrendingDown className="h-4 w-4" /> : null}
            {trendValue}
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

// Progress Bar Component
const ProgressBar: React.FC<{ value: number; color?: string; label?: string }> = ({
  value, color = 'blue', label
}) => (
  <div className="w-full">
    {label && (
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">{value.toFixed(1)}%</span>
      </div>
    )}
    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full bg-${color}-600 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  </div>
)

// Map i18n language codes to browser locale codes
const getLocale = (lang: string): string => {
  const localeMap: Record<string, string> = {
    'pt': 'pt-PT',
    'en': 'en-GB',
    'fr': 'fr-FR',
    'de': 'de-DE'
  }
  return localeMap[lang] || 'en-GB'
}

const Analytics: React.FC = () => {
  const { t, i18n } = useTranslation()
  const locale = getLocale(i18n.language)
  const [loading, setLoading] = useState(true)
  const [kpis, setKPIs] = useState<KPIData | null>(null)
  const [activeTab, setActiveTab] = useState<'kpis' | 'predictions' | 'weather'>('kpis')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [error, setError] = useState('')

  // ML Predictions state
  const [predictions, setPredictions] = useState<MLPrediction[]>([])
  const [loadingPredictions, setLoadingPredictions] = useState(false)

  // Weather state
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(false)
  const [weatherApiKey, setWeatherApiKey] = useState('')
  const [showWeatherConfig, setShowWeatherConfig] = useState(false)
  const [savingWeatherConfig, setSavingWeatherConfig] = useState(false)
  const [weatherConfigError, setWeatherConfigError] = useState('')

  useEffect(() => {
    loadKPIs()
  }, [dateRange])

  useEffect(() => {
    if (activeTab === 'predictions') {
      loadPredictions()
    } else if (activeTab === 'weather') {
      loadWeather()
    }
  }, [activeTab])

  const loadKPIs = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get(`/analytics/kpis?start_date=${dateRange.start}&end_date=${dateRange.end}`)
      setKPIs(data)
    } catch (err: any) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setLoading(false)
    }
  }

  const loadPredictions = async () => {
    setLoadingPredictions(true)
    try {
      const data = await api.get('/analytics/ml/predict-maintenance')
      setPredictions(data.predictions || [])
    } catch (err) {
      console.error('Error loading predictions:', err)
    } finally {
      setLoadingPredictions(false)
    }
  }

  const loadWeather = async () => {
    setLoadingWeather(true)
    try {
      // Load weather data, forecast and alerts in parallel
      const [weatherData, forecastData, alertsData] = await Promise.all([
        api.get('/analytics/weather').catch(() => ({ configured: false })),
        api.get('/analytics/weather/forecast').catch(() => ({ configured: false, forecast: [] })),
        api.get('/analytics/weather/alerts').catch(() => ({ configured: false, alerts: [] }))
      ])

      // Check if weather is configured
      if (!weatherData.configured) {
        setShowWeatherConfig(true)
        setWeather(null)
        return
      }

      // Combine all data
      setWeather({
        configured: true,
        locations: weatherData.locations || [],
        forecast: forecastData.forecast || [],
        alerts: alertsData.alerts || [],
        maintenance_windows: forecastData.maintenance_windows || [],
        city: forecastData.city,
        fetched_at: weatherData.fetched_at
      })
      setShowWeatherConfig(false)
    } catch (err: any) {
      console.error('Error loading weather:', err)
      setShowWeatherConfig(true)
    } finally {
      setLoadingWeather(false)
    }
  }

  const saveWeatherConfig = async () => {
    if (!weatherApiKey.trim()) {
      setWeatherConfigError(t('analytics.apiKeyRequired'))
      return
    }

    setSavingWeatherConfig(true)
    setWeatherConfigError('')

    try {
      const response = await api.post('/analytics/weather/config', { api_key: weatherApiKey.trim() })
      console.log('Weather config saved:', response)
      setShowWeatherConfig(false)
      setWeatherApiKey('')
      await loadWeather()
    } catch (err: any) {
      console.error('Error saving weather config:', err)
      // Extract error message from response
      const errorMsg = err.response?.data?.error || err.data?.error || err.message || t('analytics.apiKeyInvalid')
      setWeatherConfigError(errorMsg)
    } finally {
      setSavingWeatherConfig(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase()
    if (desc.includes('rain') || desc.includes('chuva')) return <CloudRain className="h-6 w-6 text-blue-500" />
    if (desc.includes('cloud') || desc.includes('nuvem')) return <Cloud className="h-6 w-6 text-gray-500" />
    if (desc.includes('wind') || desc.includes('vento')) return <Wind className="h-6 w-6 text-teal-500" />
    return <Sun className="h-6 w-6 text-yellow-500" />
  }

  const handleExport = async (type: 'interventions' | 'costs') => {
    try {
      const response = await fetch(
        `/api/analytics/export?type=${type}&start_date=${dateRange.start}&end_date=${dateRange.end}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      )
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics_${type}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
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
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button onClick={loadKPIs} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          {t('common.refresh')}
        </button>
      </div>
    )
  }

  // Render ML Predictions Tab
  const renderPredictions = () => {
    if (loadingPredictions) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('analytics.lowRisk')}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {predictions.filter(p => p.priority === 'low').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('analytics.mediumRisk')}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {predictions.filter(p => p.priority === 'medium').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('analytics.highRisk')}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {predictions.filter(p => p.priority === 'high').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('analytics.criticalRisk')}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {predictions.filter(p => p.priority === 'critical').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Predictions List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('analytics.maintenancePredictions')}
              </h2>
            </div>
            <button
              onClick={loadPredictions}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {predictions.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {predictions
                .sort((a, b) => b.risk_score - a.risk_score)
                .slice(0, 20)
                .map((prediction) => (
                  <div key={prediction.asset_id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {prediction.serial_number}
                        </p>
                        {prediction.product_reference && (
                          <p className="text-sm text-gray-500">{prediction.product_reference}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            {prediction.total_interventions} {t('analytics.interventions')}
                          </span>
                          {prediction.corrective_count > 0 && (
                            <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 rounded">
                              {prediction.corrective_count} {t('analytics.corrective')}
                            </span>
                          )}
                          {prediction.days_until_maintenance !== undefined && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded">
                              {prediction.days_until_maintenance} {t('common.days')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {prediction.recommendation}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(prediction.priority)}`}>
                          {prediction.risk_score}%
                        </span>
                        <p className="text-xs text-gray-500 mt-1 capitalize">
                          {t(`analytics.risk.${prediction.priority}`)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {prediction.failure_probability}% {t('analytics.failureProbability')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              {t('analytics.noPredictions')}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render Weather Tab
  const renderWeather = () => {
    if (loadingWeather) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      )
    }

    if (showWeatherConfig || !weather || !weather.configured) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 max-w-md mx-auto">
          <div className="text-center mb-6">
            <Cloud className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('analytics.configureWeather')}
            </h2>
            <p className="text-gray-500 mt-2">
              {t('analytics.weatherApiDescription')}
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                OpenWeatherMap API Key
              </label>
              <input
                type="text"
                value={weatherApiKey}
                onChange={(e) => {
                  setWeatherApiKey(e.target.value)
                  setWeatherConfigError('')
                }}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 ${
                  weatherConfigError
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {weatherConfigError && (
                <p className="mt-1 text-sm text-red-500">{weatherConfigError}</p>
              )}
            </div>
            <button
              onClick={saveWeatherConfig}
              disabled={!weatherApiKey.trim() || savingWeatherConfig}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingWeatherConfig ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </button>
            <p className="text-xs text-gray-500 text-center">
              {t('analytics.getApiKeyHint')}{' '}
              <a
                href="https://openweathermap.org/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                openweathermap.org
              </a>
            </p>
          </div>
        </div>
      )
    }

    const primaryLocation = weather.locations?.[0]

    return (
      <div className="space-y-6">
        {/* Current Weather - show first location */}
        {primaryLocation && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('analytics.currentWeather')}
                </h2>
                <p className="text-sm text-gray-500">{primaryLocation.location}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadWeather}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title={t('common.refresh')}
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowWeatherConfig(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {getWeatherIcon(primaryLocation.description)}
              <div>
                <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                  {Math.round(primaryLocation.temperature)}°C
                </p>
                <p className="text-gray-500 capitalize">{primaryLocation.description}</p>
              </div>
              <div className="ml-auto grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Thermometer className="h-5 w-5 text-red-500 mx-auto" />
                  <p className="text-sm text-gray-500">{t('analytics.humidity')}</p>
                  <p className="font-medium">{primaryLocation.humidity}%</p>
                </div>
                <div className="text-center">
                  <Wind className="h-5 w-5 text-teal-500 mx-auto" />
                  <p className="text-sm text-gray-500">{t('analytics.wind')}</p>
                  <p className="font-medium">{primaryLocation.wind_speed} m/s</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No locations configured */}
        {(!weather.locations || weather.locations.length === 0) && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-700 text-center">
            <MapPin className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
            <h3 className="font-medium text-yellow-700 dark:text-yellow-400 mb-2">
              {t('analytics.noLocations')}
            </h3>
            <p className="text-sm text-yellow-600 dark:text-yellow-300">
              {t('analytics.noLocationsDescription')}
            </p>
          </div>
        )}

        {/* Weather Alerts */}
        {weather.alerts && weather.alerts.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h3 className="font-medium text-orange-700 dark:text-orange-400">
                {t('analytics.weatherAlerts')}
              </h3>
            </div>
            <div className="space-y-3">
              {weather.alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                    alert.severity === 'high' ? 'bg-red-500' :
                    alert.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-500">{alert.location} • {alert.asset_count} ativos</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      {alert.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multiple Locations */}
        {weather.locations && weather.locations.length > 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('analytics.allLocations')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weather.locations.map((loc, i) => (
                <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getWeatherIcon(loc.description)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {loc.location}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">{loc.description}</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {Math.round(loc.temperature)}°C
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span>💧 {loc.humidity}%</span>
                    <span>💨 {loc.wind_speed} m/s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forecast */}
        {weather.forecast && weather.forecast.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('analytics.forecast5Days')}
              </h2>
              {weather.city && (
                <span className="text-sm text-gray-500">{weather.city}</span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {weather.forecast.slice(0, 8).map((item, i) => {
                const date = new Date(item.datetime)
                const isGoodForMaintenance = item.rain_probability < 30 && item.wind_speed < 10
                return (
                  <div
                    key={i}
                    className={`text-center p-3 rounded-lg ${
                      isGoodForMaintenance
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                        : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {date.toLocaleDateString(locale, { weekday: 'short' })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="my-2">{getWeatherIcon(item.description)}</div>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {Math.round(item.temperature)}°
                    </p>
                    <p className="text-xs text-gray-500">{Math.round(item.rain_probability)}% 🌧️</p>
                    {isGoodForMaintenance && (
                      <span className="text-[10px] text-green-600 mt-1 block">
                        ✓ {t('analytics.goodForMaintenance')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Maintenance Windows */}
        {weather.maintenance_windows && weather.maintenance_windows.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">
                {t('analytics.goodMaintenanceWindows')}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {weather.maintenance_windows.slice(0, 6).map((window, i) => {
                const date = new Date(window.datetime)
                return (
                  <div key={i} className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1 capitalize">
                      {window.conditions} • {Math.round(window.temperature)}°C
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!kpis && activeTab === 'kpis') return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('analytics.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('analytics.description')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range */}
          {activeTab === 'kpis' && (
          <>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent border-none text-sm focus:outline-none"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent border-none text-sm focus:outline-none"
            />
          </div>

          <button
            onClick={loadKPIs}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <RefreshCw className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="relative group">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Download className="h-4 w-4" />
              {t('common.export')}
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hidden group-hover:block z-10">
              <button
                onClick={() => handleExport('interventions')}
                className="block w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
              >
                {t('analytics.exportInterventions')}
              </button>
              <button
                onClick={() => handleExport('costs')}
                className="block w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
              >
                {t('analytics.exportCosts')}
              </button>
            </div>
          </div>
          </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('kpis')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'kpis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            {t('analytics.kpis')}
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'predictions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Brain className="h-4 w-4" />
            {t('analytics.mlPredictions')}
          </button>
          <button
            onClick={() => setActiveTab('weather')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'weather'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Cloud className="h-4 w-4" />
            {t('analytics.weather')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'predictions' && renderPredictions()}
      {activeTab === 'weather' && renderWeather()}
      {activeTab === 'kpis' && kpis && (
      <>
      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t('analytics.mtbf')}
          value={`${kpis.mtbf.days.toFixed(0)} ${t('common.days')}`}
          subtitle={`${kpis.mtbf.value.toFixed(0)} ${t('analytics.hours')}`}
          icon={<Clock className="h-6 w-6" />}
          color="blue"
        />
        <KPICard
          title={t('analytics.mttr')}
          value={`${kpis.mttr.value.toFixed(1)}h`}
          subtitle={`${kpis.mttr.repairs_count} ${t('analytics.repairs')}`}
          icon={<Wrench className="h-6 w-6" />}
          color="orange"
        />
        <KPICard
          title={t('analytics.availability')}
          value={`${kpis.availability.current.toFixed(1)}%`}
          subtitle={`${kpis.availability.operational_assets}/${kpis.availability.total_assets} ${t('analytics.operational')}`}
          icon={<Activity className="h-6 w-6" />}
          color="green"
        />
        <KPICard
          title={t('analytics.totalCosts')}
          value={`€${kpis.costs.total.toLocaleString()}`}
          subtitle={`€${kpis.costs.cost_per_asset.toFixed(0)}/${t('analytics.perAsset')}`}
          icon={<DollarSign className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Efficiency Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Efficiency Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Target className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('analytics.efficiencyMetrics')}
            </h2>
          </div>

          <div className="space-y-4">
            <ProgressBar
              value={kpis.efficiency.completion_rate}
              color="green"
              label={t('analytics.completionRate')}
            />

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {kpis.efficiency.completed}
                </p>
                <p className="text-sm text-gray-500">{t('analytics.completed')}</p>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600 mx-auto" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {kpis.efficiency.pending + kpis.efficiency.in_progress}
                </p>
                <p className="text-sm text-gray-500">{t('analytics.pending')}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">{t('analytics.avgCompletionTime')}</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {kpis.efficiency.avg_completion_hours.toFixed(1)}h
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Asset Health */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Gauge className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('analytics.assetHealth')}
            </h2>
          </div>

          <div className="space-y-4">
            {kpis.asset_health.by_status.map((status, index) => {
              const total = kpis.asset_health.by_status.reduce((sum, s) => sum + s.count, 0)
              const percentage = (status.count / total) * 100
              const colors = ['green', 'yellow', 'orange', 'red', 'gray']
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-gray-600 dark:text-gray-400 truncate">
                    {status.status || t('analytics.unknown')}
                  </div>
                  <div className="flex-1">
                    <ProgressBar value={percentage} color={colors[index] || 'blue'} />
                  </div>
                  <div className="w-12 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                    {status.count}
                  </div>
                </div>
              )
            })}

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-lg font-bold text-red-600">{kpis.asset_health.warranty_expired}</p>
                <p className="text-xs text-gray-500">{t('analytics.warrantyExpired')}</p>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-lg font-bold text-orange-600">{kpis.asset_health.warranty_expiring_30d}</p>
                <p className="text-xs text-gray-500">{t('analytics.warrantyExpiring')}</p>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-lg font-bold text-blue-600">{kpis.asset_health.maintenance_due_7d}</p>
                <p className="text-xs text-gray-500">{t('analytics.maintenanceDue')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interventions by Type */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('analytics.interventionsByType')}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.interventions_summary.by_type.map((type, index) => {
            const colors = ['blue', 'green', 'orange', 'purple']
            const labels: Record<string, string> = {
              'preventiva': t('interventions.type.preventiva'),
              'corretiva': t('interventions.type.corretiva'),
              'substituicao': t('interventions.type.substituicao'),
              'inspecao': t('interventions.type.inspecao')
            }
            return (
              <div
                key={type.intervention_type}
                className={`p-4 rounded-lg bg-${colors[index % 4]}-50 dark:bg-${colors[index % 4]}-900/20`}
              >
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {type.count}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {labels[type.intervention_type] || type.intervention_type}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Assets with Most Interventions */}
      {kpis.interventions_summary.top_assets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('analytics.topAssets')}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">#</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('assets.serialNumber')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('analytics.interventionCount')}</th>
                </tr>
              </thead>
              <tbody>
                {kpis.interventions_summary.top_assets.map((asset, index) => (
                  <tr key={asset.serial_number} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-500">{index + 1}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-blue-600 hover:underline cursor-pointer">
                        {asset.serial_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium">
                        {asset.intervention_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Costs by Type */}
      {kpis.costs.by_type.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('analytics.costsByType')}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('common.type')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('analytics.count')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('analytics.totalCost')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('analytics.avgCost')}</th>
                </tr>
              </thead>
              <tbody>
                {kpis.costs.by_type.map((cost) => (
                  <tr key={cost.intervention_type} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      {cost.intervention_type}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                      {cost.count}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                      €{cost.total?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                      €{cost.average?.toFixed(2) || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}

export default Analytics
