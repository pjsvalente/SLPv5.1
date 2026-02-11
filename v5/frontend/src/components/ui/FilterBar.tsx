import React from 'react'
import { useTranslation } from 'react-i18next'
import { X, Filter, RotateCcw } from 'lucide-react'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  name: string
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

interface FilterBarProps {
  filters: FilterConfig[]
  onReset?: () => void
  className?: string
}

export function FilterBar({ filters, onReset, className = '' }: FilterBarProps) {
  const { t } = useTranslation()

  const hasActiveFilters = filters.some(f => f.value !== '')

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.filters')}</span>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <RotateCcw className="h-3 w-3" />
              {t('common.reset')}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <div key={filter.name} className="relative">
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 transition-colors
                  ${filter.value
                    ? 'border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }
                  hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
              >
                <option value="">{filter.label}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {filter.value && (
                <button
                  onClick={() => filter.onChange('')}
                  className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-2">
            {filters.filter(f => f.value).map((filter) => {
              const selectedOption = filter.options.find(o => o.value === filter.value)
              return (
                <span
                  key={filter.name}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full"
                >
                  {filter.label}: {selectedOption?.label || filter.value}
                  <button
                    onClick={() => filter.onChange('')}
                    className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
