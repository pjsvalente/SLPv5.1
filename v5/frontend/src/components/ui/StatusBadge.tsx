import { useTranslation } from 'react-i18next'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  colorMap?: Record<string, string>
}

// Dynamic color classes based on colorMap values
const colorClasses: Record<string, string> = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  gold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
}

// Status to translation key and color mapping
const statusConfig: Record<string, { labelKey: string; className: string }> = {
  // Asset statuses
  'Operacional': {
    labelKey: 'statuses.operational',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  },
  'Manutencao Necessaria': {
    labelKey: 'statuses.maintenanceRequired',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  },
  'Manutenção Necessária': {
    labelKey: 'statuses.maintenanceRequired',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  },
  'Em Reparação': {
    labelKey: 'statuses.inRepair',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  },
  'Em Reparacao': {
    labelKey: 'statuses.inRepair',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  },
  'Desativado': {
    labelKey: 'statuses.deactivated',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  },

  // Intervention statuses
  'em_curso': {
    labelKey: 'interventions.statuses.inProgress',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  },
  'concluida': {
    labelKey: 'interventions.statuses.completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  },
  'cancelada': {
    labelKey: 'interventions.statuses.cancelled',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  },
  'pendente': {
    labelKey: 'interventions.statuses.pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  },

  // User statuses
  'active': {
    labelKey: 'common.active',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  },
  'inactive': {
    labelKey: 'common.inactive',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  },

  // Roles
  'superadmin': {
    labelKey: 'users.roles.superadmin',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
  },
  'admin': {
    labelKey: 'users.roles.admin',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  },
  'user': {
    labelKey: 'users.roles.user',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  },
  'operator': {
    labelKey: 'users.roles.operator',
    className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
  },

  // Intervention types
  'preventiva': {
    labelKey: 'interventions.types.preventive',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  },
  'corretiva': {
    labelKey: 'interventions.types.corrective',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  },
  'substituicao': {
    labelKey: 'interventions.types.installation',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
  },
  'inspecao': {
    labelKey: 'interventions.types.inspection',
    className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
  }
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm'
}

export function StatusBadge({ status, size = 'md', colorMap }: StatusBadgeProps) {
  const { t } = useTranslation()

  // If colorMap is provided, use it for dynamic styling
  if (colorMap && colorMap[status]) {
    const colorKey = colorMap[status]
    const className = colorClasses[colorKey] || colorClasses.gray

    return (
      <span
        className={`inline-flex items-center font-medium rounded-full ${className} ${sizeClasses[size]}`}
      >
        {status}
      </span>
    )
  }

  // Fall back to predefined config
  const config = statusConfig[status]

  if (config) {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-full ${config.className} ${sizeClasses[size]}`}
      >
        {t(config.labelKey)}
      </span>
    )
  }

  // Default fallback for unknown statuses
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 ${sizeClasses[size]}`}
    >
      {status}
    </span>
  )
}
