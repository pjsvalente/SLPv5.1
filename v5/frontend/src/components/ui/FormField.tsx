import { forwardRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconMapPin, IconNavigation, IconCrosshair } from '@/components/icons'

// GPS Input Component for latitude, longitude format
interface GPSInputProps {
  name: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
}

function GPSInput({ name, value, onChange, placeholder, required, disabled, error }: GPSInputProps) {
  const { t } = useTranslation()
  const [gettingLocation, setGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')

  // Parse value to get lat/lng
  const parseCoords = (val: string): { lat: string; lng: string } => {
    if (!val) return { lat: '', lng: '' }
    const parts = val.split(',').map(s => s.trim())
    return {
      lat: parts[0] || '',
      lng: parts[1] || ''
    }
  }

  const coords = parseCoords(value)

  const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLat = e.target.value
    if (newLat || coords.lng) {
      onChange(`${newLat}, ${coords.lng}`)
    } else {
      onChange('')
    }
  }

  const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLng = e.target.value
    if (coords.lat || newLng) {
      onChange(`${coords.lat}, ${newLng}`)
    } else {
      onChange('')
    }
  }

  const handleCombinedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(t('form.geolocationNotSupported'))
      return
    }

    setGettingLocation(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(8)
        const lng = position.coords.longitude.toFixed(8)
        onChange(`${lat}, ${lng}`)
        setGettingLocation(false)
      },
      (err) => {
        setLocationError(t('form.geolocationError'))
        setGettingLocation(false)
        console.error('Geolocation error:', err)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const openInMaps = () => {
    if (coords.lat && coords.lng) {
      window.open(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`, '_blank')
    }
  }

  const baseInputClass = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed ${
    error
      ? 'border-red-500 dark:border-red-400'
      : 'border-gray-300 dark:border-gray-600'
  } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`

  return (
    <div className="space-y-2">
      {/* Combined input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <IconMapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            id={name}
            name={name}
            value={value}
            onChange={handleCombinedChange}
            placeholder={placeholder || 'latitude, longitude'}
            required={required}
            disabled={disabled}
            className={`${baseInputClass} pl-9`}
          />
        </div>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={disabled || gettingLocation}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          title={t('form.getCurrentLocation')}
        >
          {gettingLocation ? (
            <IconNavigation className="h-4 w-4 animate-pulse" />
          ) : (
            <IconCrosshair className="h-4 w-4" />
          )}
        </button>
        {coords.lat && coords.lng && (
          <button
            type="button"
            onClick={openInMaps}
            disabled={disabled}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 flex items-center gap-1"
            title={t('form.viewOnGoogleMaps')}
          >
            <IconNavigation className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Separate lat/lng inputs for precision */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('form.latitude')}</label>
          <input
            type="number"
            step="any"
            value={coords.lat}
            onChange={handleLatChange}
            placeholder="-90 to 90"
            disabled={disabled}
            className={`${baseInputClass} text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('form.longitude')}</label>
          <input
            type="number"
            step="any"
            value={coords.lng}
            onChange={handleLngChange}
            placeholder="-180 to 180"
            disabled={disabled}
            className={`${baseInputClass} text-sm`}
          />
        </div>
      </div>

      {locationError && (
        <p className="text-sm text-red-500">{locationError}</p>
      )}
    </div>
  )
}

interface Option {
  value: string
  label: string
}

interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'textarea' | 'select' | 'checkbox' | 'gps'
  value?: string | number | boolean
  onChange?: (value: string | number | boolean) => void
  options?: Option[] | string[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helpText?: string
  className?: string
  rows?: number
}

export const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, FormFieldProps>(
  ({
    label,
    name,
    type = 'text',
    value,
    onChange,
    options = [],
    placeholder,
    required = false,
    disabled = false,
    error,
    helpText,
    className = '',
    rows = 3
  }, ref) => {
    const { t } = useTranslation()
    const baseInputClass = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed ${
      error
        ? 'border-red-500 dark:border-red-400'
        : 'border-gray-300 dark:border-gray-600'
    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`

    const normalizedOptions: Option[] = options.map((opt) =>
      typeof opt === 'string' ? { value: opt, label: opt } : opt
    )

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (!onChange) return

      if (type === 'checkbox') {
        onChange((e.target as HTMLInputElement).checked)
      } else if (type === 'number') {
        onChange(e.target.value === '' ? '' : Number(e.target.value))
      } else {
        onChange(e.target.value)
      }
    }

    const renderInput = () => {
      switch (type) {
        case 'textarea':
          return (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              id={name}
              name={name}
              value={String(value ?? '')}
              onChange={handleChange}
              placeholder={placeholder}
              required={required}
              disabled={disabled}
              rows={rows}
              className={baseInputClass}
            />
          )

        case 'select':
          return (
            <select
              ref={ref as React.Ref<HTMLSelectElement>}
              id={name}
              name={name}
              value={String(value ?? '')}
              onChange={handleChange}
              required={required}
              disabled={disabled}
              className={baseInputClass}
            >
              <option value="">{placeholder || t('form.select')}</option>
              {normalizedOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )

        case 'checkbox':
          return (
            <div className="flex items-center gap-2">
              <input
                ref={ref as React.Ref<HTMLInputElement>}
                type="checkbox"
                id={name}
                name={name}
                checked={Boolean(value)}
                onChange={handleChange}
                required={required}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            </div>
          )

        case 'gps':
          return (
            <GPSInput
              name={name}
              value={String(value ?? '')}
              onChange={(val) => onChange && onChange(val)}
              placeholder={placeholder || '41.33879, -8.60867'}
              required={required}
              disabled={disabled}
              error={error}
            />
          )

        default:
          return (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              type={type}
              id={name}
              name={name}
              value={type === 'number' ? (value ?? '') : String(value ?? '')}
              onChange={handleChange}
              placeholder={placeholder}
              required={required}
              disabled={disabled}
              className={baseInputClass}
            />
          )
      }
    }

    if (type === 'checkbox') {
      return (
        <div className={`${className}`}>
          {renderInput()}
          {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
          {helpText && !error && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>}
        </div>
      )
    }

    return (
      <div className={`${className}`}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required === true && <span className="text-red-500 ml-1">*</span>}
        </label>
        {renderInput()}
        {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
        {helpText && !error && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>}
      </div>
    )
  }
)

FormField.displayName = 'FormField'
