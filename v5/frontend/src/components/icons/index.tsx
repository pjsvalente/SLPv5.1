/**
 * SmartLamppost v5.0 - Icon Library
 * 96 custom outlined tech icons with gradient support
 */

import React from 'react'

// ============================================================================
// TYPES & PROPS
// ============================================================================

export interface IconProps {
  size?: number
  className?: string
  gradient?: boolean
  color?: string
}

// ============================================================================
// GRADIENT DEFINITIONS - Include this once in your app (e.g., in App.tsx)
// ============================================================================

export const IconGradientDefs: React.FC = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <linearGradient id="slp-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#00A0DC' }} />
        <stop offset="100%" style={{ stopColor: '#003366' }} />
      </linearGradient>
    </defs>
  </svg>
)

// Helper to get stroke/fill
const getStroke = (gradient?: boolean, color?: string) =>
  gradient ? 'url(#slp-icon-grad)' : (color || 'currentColor')

const getFill = (gradient?: boolean, color?: string) =>
  gradient ? 'url(#slp-icon-grad)' : (color || 'currentColor')

// ============================================================================
// CATEGORIA 1: NAVEGAÇÃO PRINCIPAL (12)
// ============================================================================

export const IconDashboard: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="6" width="36" height="36" rx="6" stroke={stroke} strokeWidth="2" fill="none"/>
      <rect x="10" y="10" width="14" height="10" rx="3" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="27" y="10" width="11" height="16" rx="3" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="10" y="23" width="14" height="15" rx="3" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="27" y="29" width="11" height="9" rx="3" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <circle cx="17" cy="15" r="2" fill={fill}/>
    </svg>
  )
}

export const IconPackage: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="12" width="36" height="30" rx="4" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M6 20H42" stroke={stroke} strokeWidth="1.5"/>
      <rect x="10" y="4" width="10" height="10" rx="3" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <circle cx="15" cy="9" r="2" fill={fill}/>
      <line x1="12" y1="27" x2="36" y2="27" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
      <line x1="12" y1="33" x2="30" y2="33" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconAssets = IconPackage

export const IconScanLine: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M12 6H6V12" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M36 6H42V12" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 42H6V36" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M36 42H42V36" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <rect x="12" y="12" width="24" height="24" rx="3" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="17" y="17" width="6" height="6" fill={fill}/>
      <rect x="25" y="17" width="6" height="6" stroke={stroke} strokeWidth="1" fill="none"/>
      <rect x="17" y="25" width="6" height="6" stroke={stroke} strokeWidth="1" fill="none"/>
      <rect x="25" y="25" width="6" height="6" fill={fill}/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconScanner = IconScanLine

export const IconMapPin: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4C16.268 4 10 10.268 10 18C10 28 24 44 24 44C24 44 38 28 38 18C38 10.268 31.732 4 24 4Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="18" r="6" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <circle cx="24" cy="18" r="2" fill={fill}/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconMap = IconMapPin

export const IconWrench: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M38 10C35.79 7.79 32.42 7.17 29.52 8.34L18 19.86L28.14 30L39.66 18.48C40.83 15.58 40.21 12.21 38 10Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M18 19.86L8 29.86C6.34 31.52 6.34 34.2 8 35.86L12.14 40C13.8 41.66 16.48 41.66 18.14 40L28.14 30" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="13" cy="35" r="2" fill={fill}/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconInterventions = IconWrench

export const IconBookOpen: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M6 8V40C6 40 12 36 24 36C36 36 42 40 42 40V8C42 8 36 4 24 4C12 4 6 8 6 8Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M24 4V36" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 2"/>
      <line x1="12" y1="14" x2="20" y2="14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="20" x2="18" y2="20" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="28" y1="14" x2="36" y2="14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="30" y1="20" x2="36" y2="20" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconCatalog = IconBookOpen

export const IconHardHat: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M8 28C8 28 8 18 24 18C40 18 40 28 40 28" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M6 28H42V34C42 36.21 40.21 38 38 38H10C7.79 38 6 36.21 6 34V28Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M24 18V8" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="8" r="3" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <line x1="12" y1="33" x2="36" y2="33" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconTechnicians = IconHardHat

export const IconFileText: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M28 4H12C9.79 4 8 5.79 8 8V40C8 42.21 9.79 44 12 44H36C38.21 44 40 42.21 40 40V16L28 4Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M28 4V16H40" stroke={stroke} strokeWidth="2"/>
      <line x1="14" y1="24" x2="34" y2="24" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="14" y1="30" x2="30" y2="30" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
      <line x1="14" y1="36" x2="26" y2="36" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconReports = IconFileText

export const IconBarChart3: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="6" width="36" height="36" rx="4" stroke={stroke} strokeWidth="2" fill="none"/>
      <rect x="12" y="26" width="6" height="12" rx="1" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="21" y="18" width="6" height="20" rx="1" stroke={stroke} strokeWidth="1.5" fill={fill} opacity="0.3"/>
      <rect x="30" y="12" width="6" height="26" rx="1" stroke={stroke} strokeWidth="1.5" fill="none"/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconAnalytics = IconBarChart3

export const IconUsers: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="18" cy="14" r="8" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="34" cy="16" r="6" stroke={stroke} strokeWidth="1.5" fill="none" opacity="0.7"/>
      <path d="M4 40C4 32.27 10.27 26 18 26C25.73 26 32 32.27 32 40" stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M30 38C30 32.48 33.58 28 38 28C42.42 28 46 32.48 46 38" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <circle cx="18" cy="14" r="3" fill={fill} opacity="0.3"/>
    </svg>
  )
}

export const IconBuilding2: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4L42 14V44H6V14L24 4Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <rect x="14" y="22" width="6" height="6" rx="1" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="28" y="22" width="6" height="6" rx="1" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="18" y="34" width="12" height="10" rx="1" stroke={stroke} strokeWidth="1.5" fill={fill} opacity="0.3"/>
      <path d="M24 4V14" stroke={stroke} strokeWidth="1.5"/>
      <circle cx="24" cy="14" r="2" fill={fill}/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconTenants = IconBuilding2

export const IconSettings: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="8" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="24" r="3" fill={fill} opacity="0.5"/>
      <path d="M24 4V10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 38V44" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 24H10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M38 24H44" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M9.86 9.86L14.1 14.1" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M33.9 33.9L38.14 38.14" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M9.86 38.14L14.1 33.9" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M33.9 14.1L38.14 9.86" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ============================================================================
// CATEGORIA 2: UI CONTROLS (14)
// ============================================================================

export const IconMenu: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <line x1="8" y1="12" x2="40" y2="12" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="8" y1="24" x2="40" y2="24" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="8" y1="36" x2="40" y2="36" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

export const IconChevronLeft: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M30 8L14 24L30 40" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

export const IconChevronRight: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M18 8L34 24L18 40" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

export const IconChevronUp: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M8 30L24 14L40 30" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

export const IconChevronDown: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M8 18L24 34L40 18" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

export const IconSun: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="8" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M24 4V10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 38V44" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 24H10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M38 24H44" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M9.86 9.86L14.1 14.1" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M33.9 33.9L38.14 38.14" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M9.86 38.14L14.1 33.9" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M33.9 14.1L38.14 9.86" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export const IconMoon: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M40 26C40 35.94 31.94 44 22 44C14.87 44 8.73 39.69 6 33.53C7.27 33.84 8.61 34 10 34C19.94 34 28 25.94 28 16C28 12.72 27.17 9.64 25.7 7C33.89 9.08 40 16.84 40 26Z" stroke={stroke} strokeWidth="2" fill="none"/>
    </svg>
  )
}

export const IconLogOut: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M18 8H12C9.79 8 8 9.79 8 12V36C8 38.21 9.79 40 12 40H18" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M32 32L40 24L32 16" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M40 24H18" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconLogout = IconLogOut

export const IconBell: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M36 16C36 9.37 30.63 4 24 4C17.37 4 12 9.37 12 16C12 30 6 34 6 34H42C42 34 36 30 36 16Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M27.46 40C27.02 40.83 26.11 41.38 25.08 41.38H22.92C21.89 41.38 20.98 40.83 20.54 40" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="36" cy="8" r="4" fill={fill}/>
    </svg>
  )
}

export const IconGlobe: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth="2" fill="none"/>
      <ellipse cx="24" cy="24" rx="8" ry="18" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <path d="M6 24H42" stroke={stroke} strokeWidth="1.5"/>
      <path d="M8 14H40" stroke={stroke} strokeWidth="1" opacity="0.6"/>
      <path d="M8 34H40" stroke={stroke} strokeWidth="1" opacity="0.6"/>
    </svg>
  )
}

export const IconSearch: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="20" cy="20" r="14" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M30 30L42 42" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="20" cy="20" r="6" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 2" fill="none"/>
    </svg>
  )
}

export const IconFilter: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M6 8H42L28 24V38L20 42V24L6 8Z" stroke={stroke} strokeWidth="2" fill="none"/>
    </svg>
  )
}

export const IconRotateCcw: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M4 12V22H14" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.52 30C10.14 36.58 16.04 41.5 23.16 41.98C31.64 42.54 39.04 36.4 40.68 28.08C42.32 19.76 37.28 11.56 29.2 8.68C23.16 6.54 16.52 7.96 11.88 12.12L4 19" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconRefresh = IconRotateCcw

export const IconRefreshCw: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M44 12V22H34" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 36V26H14" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M39.48 18C37.86 11.42 31.96 6.5 24.84 6.02C16.36 5.46 8.96 11.6 7.32 19.92" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M8.52 30C10.14 36.58 16.04 41.5 23.16 41.98C31.64 42.54 39.04 36.4 40.68 28.08" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ============================================================================
// CATEGORIA 3: STATUS & ALERTAS (5)
// ============================================================================

export const IconCheckCircle: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M14 24L20 30L34 16" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconCheck = IconCheckCircle

export const IconXCircle: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M16 16L32 32" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <path d="M32 16L16 32" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconClose = IconXCircle

export const IconAlertTriangle: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 6L44 40H4L24 6Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill="none"/>
      <path d="M24 18V26" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="24" cy="33" r="2" fill={fill}/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconWarning = IconAlertTriangle

export const IconAlertCircle: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M24 14V26" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="24" cy="33" r="2" fill={fill}/>
    </svg>
  )
}

export const IconInfo: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="14" r="2" fill={fill}/>
      <path d="M24 22V34" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

// ============================================================================
// CATEGORIA 4: AÇÕES (10)
// ============================================================================

export const IconSave: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M38 42H10C7.79 42 6 40.21 6 38V10C6 7.79 7.79 6 10 6H32L42 16V38C42 40.21 40.21 42 38 42Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M32 6V16H42" stroke={stroke} strokeWidth="2"/>
      <rect x="14" y="26" width="20" height="16" rx="2" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <line x1="18" y1="32" x2="30" y2="32" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="38" x2="26" y2="38" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}

export const IconTrash2: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M6 12H42" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M38 12V40C38 42.21 36.21 44 34 44H14C11.79 44 10 42.21 10 40V12" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M16 12V8C16 5.79 17.79 4 20 4H28C30.21 4 32 5.79 32 8V12" stroke={stroke} strokeWidth="2"/>
      <line x1="20" y1="22" x2="20" y2="34" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="28" y1="22" x2="28" y2="34" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconTrash = IconTrash2

export const IconEdit: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M34 6L42 14L16 40H8V32L34 6Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill="none"/>
      <path d="M28 12L36 20" stroke={stroke} strokeWidth="2"/>
      <path d="M8 40H16" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export const IconX: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M12 12L36 36" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <path d="M36 12L12 36" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

export const IconPlus: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 8V40" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
      <path d="M8 24H40" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

export const IconArrowLeft: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M38 24H10" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M20 14L10 24L20 34" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export const IconCopy: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="16" y="16" width="26" height="26" rx="4" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M32 16V10C32 7.79 30.21 6 28 6H10C7.79 6 6 7.79 6 10V28C6 30.21 7.79 32 10 32H16" stroke={stroke} strokeWidth="2"/>
    </svg>
  )
}

export const IconLoader2: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="16" stroke={stroke} strokeWidth="3" strokeDasharray="20 80" fill="none" strokeLinecap="round"/>
      <circle cx="24" cy="24" r="10" stroke={stroke} strokeWidth="2" strokeDasharray="15 60" fill="none" opacity="0.5" strokeLinecap="round"/>
    </svg>
  )
}

export const IconMoreHorizontal: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="12" cy="24" r="3" fill={fill}/>
      <circle cx="24" cy="24" r="3" fill={fill}/>
      <circle cx="36" cy="24" r="3" fill={fill}/>
    </svg>
  )
}

// ============================================================================
// CATEGORIA 5: FICHEIROS (7)
// ============================================================================

export const IconUpload: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M42 30V38C42 40.21 40.21 42 38 42H10C7.79 42 6 40.21 6 38V30" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 32V8" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 18L24 8L34 18" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export const IconDownload: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M42 30V38C42 40.21 40.21 42 38 42H10C7.79 42 6 40.21 6 38V30" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 8V32" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 22L24 32L34 22" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export const IconFile: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M28 4H12C9.79 4 8 5.79 8 8V40C8 42.21 9.79 44 12 44H36C38.21 44 40 42.21 40 40V16L28 4Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M28 4V16H40" stroke={stroke} strokeWidth="2"/>
    </svg>
  )
}

export const IconImage: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="8" width="36" height="32" rx="4" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="16" cy="18" r="4" stroke={stroke} strokeWidth="1.5" fill={fill} opacity="0.3"/>
      <path d="M42 32L32 22L18 36H42V32Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M6 36L16 26L24 34" stroke={stroke} strokeWidth="2"/>
    </svg>
  )
}

export const IconFolderOpen: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M44 38H10C7.79 38 6.34 35.66 7.34 33.66L14 20H42C44.21 20 45.66 22.34 44.66 24.34L38 38Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M14 20V12C14 9.79 15.79 8 18 8H22L26 12H38C40.21 12 42 13.79 42 16V20" stroke={stroke} strokeWidth="2"/>
    </svg>
  )
}

export const IconFileSpreadsheet: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M28 4H12C9.79 4 8 5.79 8 8V40C8 42.21 9.79 44 12 44H36C38.21 44 40 42.21 40 40V16L28 4Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M28 4V16H40" stroke={stroke} strokeWidth="2"/>
      <line x1="14" y1="24" x2="34" y2="24" stroke={stroke} strokeWidth="1.5"/>
      <line x1="14" y1="32" x2="34" y2="32" stroke={stroke} strokeWidth="1.5"/>
      <line x1="24" y1="24" x2="24" y2="38" stroke={stroke} strokeWidth="1.5"/>
    </svg>
  )
}

// ============================================================================
// CATEGORIA 6: SCANNER (6)
// ============================================================================

export const IconQrCode: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="6" width="14" height="14" rx="2" stroke={stroke} strokeWidth="2" fill="none"/>
      <rect x="10" y="10" width="6" height="6" fill={fill}/>
      <rect x="28" y="6" width="14" height="14" rx="2" stroke={stroke} strokeWidth="2" fill="none"/>
      <rect x="32" y="10" width="6" height="6" fill={fill}/>
      <rect x="6" y="28" width="14" height="14" rx="2" stroke={stroke} strokeWidth="2" fill="none"/>
      <rect x="10" y="32" width="6" height="6" fill={fill}/>
      <rect x="28" y="28" width="6" height="6" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="36" y="28" width="6" height="6" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="28" y="36" width="6" height="6" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="36" y="36" width="6" height="6" fill={fill} opacity="0.5"/>
    </svg>
  )
}

export const IconBarcode: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="8" width="4" height="32" fill={fill}/>
      <rect x="10" y="8" width="2" height="32" fill={fill} opacity="0.8"/>
      <rect x="14" y="8" width="4" height="32" fill={fill}/>
      <rect x="20" y="8" width="2" height="32" fill={fill} opacity="0.6"/>
      <rect x="24" y="8" width="2" height="32" fill={fill}/>
      <rect x="28" y="8" width="4" height="32" fill={fill} opacity="0.8"/>
      <rect x="34" y="8" width="2" height="32" fill={fill}/>
      <rect x="38" y="8" width="2" height="32" fill={fill} opacity="0.6"/>
      <rect x="42" y="8" width="2" height="32" fill={fill}/>
    </svg>
  )
}

export const IconCamera: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M42 38H6C4.9 38 4 37.1 4 36V14C4 12.9 4.9 12 6 12H14L18 6H30L34 12H42C43.1 12 44 12.9 44 14V36C44 37.1 43.1 38 42 38Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="24" r="8" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="24" r="3" fill={fill}/>
    </svg>
  )
}

export const IconHistory: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M24 12V24L32 28" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 24C6 14.06 14.06 6 24 6" stroke={stroke} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

export const IconCrosshair: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="16" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="24" r="6" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <path d="M24 4V12" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 36V44" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 24H12" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M36 24H44" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ============================================================================
// CATEGORIA 7: TEMPO & SEGURANÇA (8)
// ============================================================================

export const IconClock: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M24 12V24L30 30" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="24" r="2" fill={fill}/>
    </svg>
  )
}

export const IconCalendar: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="10" width="36" height="32" rx="4" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M6 20H42" stroke={stroke} strokeWidth="2"/>
      <path d="M16 6V14" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M32 6V14" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <rect x="12" y="26" width="6" height="6" rx="1" fill={fill} opacity="0.3"/>
      <rect x="21" y="26" width="6" height="6" rx="1" stroke={stroke} strokeWidth="1" fill="none"/>
      <rect x="30" y="26" width="6" height="6" rx="1" stroke={stroke} strokeWidth="1" fill="none"/>
    </svg>
  )
}

export const IconShield: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4L6 12V22C6 33.05 13.42 42.74 24 46C34.58 42.74 42 33.05 42 22V12L24 4Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="24" r="8" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 2" fill="none"/>
    </svg>
  )
}

export const IconShieldCheck: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4L6 12V22C6 33.05 13.42 42.74 24 46C34.58 42.74 42 33.05 42 22V12L24 4Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M16 24L22 30L34 18" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export const IconLock: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="10" y="20" width="28" height="24" rx="4" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M16 20V14C16 9.58 19.58 6 24 6C28.42 6 32 9.58 32 14V20" stroke={stroke} strokeWidth="2"/>
      <circle cx="24" cy="32" r="4" fill={fill}/>
    </svg>
  )
}

export const IconKey: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="34" cy="14" r="8" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="34" cy="14" r="3" fill={fill}/>
      <path d="M28 20L8 40" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 40L14 40L14 34" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 32L18 26" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export const IconCrown: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M6 36L10 14L18 22L24 10L30 22L38 14L42 36H6Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <line x1="6" y1="40" x2="42" y2="40" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="28" r="3" fill={fill}/>
    </svg>
  )
}

export const IconEye: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M4 24C4 24 12 8 24 8C36 8 44 24 44 24C44 24 36 40 24 40C12 40 4 24 4 24Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="24" r="8" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="24" r="3" fill={fill}/>
    </svg>
  )
}

// ============================================================================
// CATEGORIA 8: EQUIPAMENTOS (10)
// ============================================================================

export const IconLightbulb: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4C16.27 4 10 10.27 10 18C10 23.52 13.2 28.28 18 30.92V36C18 38.21 19.79 40 22 40H26C28.21 40 30 38.21 30 36V30.92C34.8 28.28 38 23.52 38 18C38 10.27 31.73 4 24 4Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M18 44H30" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 18C20 15.79 21.79 14 24 14" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export const IconZap: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M28 4L12 26H24L20 44L36 22H24L28 4Z" stroke={stroke} strokeWidth="2" fill={fill} opacity="0.2"/>
    </svg>
  )
}

export const IconBox: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M42 14L24 4L6 14V34L24 44L42 34V14Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M24 4V44" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 2"/>
      <path d="M6 14L24 24L42 14" stroke={stroke} strokeWidth="1.5"/>
    </svg>
  )
}

export const IconAntenna: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 44V20" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="14" r="6" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="14" r="2" fill={fill}/>
      <path d="M14 24C14 24 14 8 24 8C34 8 34 24 34 24" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 2" fill="none"/>
      <path d="M8 30C8 30 8 4 24 4C40 4 40 30 40 30" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 2" fill="none"/>
    </svg>
  )
}

export const IconCar: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M40 28V36C40 37.1 39.1 38 38 38H36C34.9 38 34 37.1 34 36V34H14V36C14 37.1 13.1 38 12 38H10C8.9 38 8 37.1 8 36V28L12 18H36L40 28Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M12 18L14 10H34L36 18" stroke={stroke} strokeWidth="2"/>
      <circle cx="14" cy="28" r="3" fill={fill}/>
      <circle cx="34" cy="28" r="3" fill={fill}/>
    </svg>
  )
}

export const IconMonitor: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="6" width="40" height="28" rx="4" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M16 42H32" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 34V42" stroke={stroke} strokeWidth="2"/>
      <line x1="4" y1="28" x2="44" y2="28" stroke={stroke} strokeWidth="1.5"/>
    </svg>
  )
}

export const IconCpu: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="10" y="10" width="28" height="28" rx="4" stroke={stroke} strokeWidth="2" fill="none"/>
      <rect x="16" y="16" width="16" height="16" rx="2" stroke={stroke} strokeWidth="1.5" fill={fill} opacity="0.2"/>
      <path d="M18 6V10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 6V10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M30 6V10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 38V42" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 38V42" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M30 38V42" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 18H10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 24H10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 30H10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M38 18H42" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M38 24H42" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M38 30H42" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export const IconColumns: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="6" width="14" height="36" rx="2" stroke={stroke} strokeWidth="2" fill="none"/>
      <rect x="28" y="6" width="14" height="36" rx="2" stroke={stroke} strokeWidth="2" fill="none"/>
      <line x1="6" y1="16" x2="20" y2="16" stroke={stroke} strokeWidth="1.5"/>
      <line x1="28" y1="16" x2="42" y2="16" stroke={stroke} strokeWidth="1.5"/>
    </svg>
  )
}

export const IconDatabase: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <ellipse cx="24" cy="10" rx="16" ry="6" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M8 10V38C8 41.31 15.16 44 24 44C32.84 44 40 41.31 40 38V10" stroke={stroke} strokeWidth="2"/>
      <path d="M8 24C8 27.31 15.16 30 24 30C32.84 30 40 27.31 40 24" stroke={stroke} strokeWidth="1.5"/>
    </svg>
  )
}

// Alias for backward compatibility
export const IconData = IconDatabase

export const IconHardDrive: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="14" width="36" height="20" rx="4" stroke={stroke} strokeWidth="2" fill="none"/>
      <line x1="6" y1="28" x2="42" y2="28" stroke={stroke} strokeWidth="1.5"/>
      <circle cx="34" cy="21" r="2" fill={fill}/>
      <line x1="12" y1="21" x2="24" y2="21" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ============================================================================
// CATEGORIA 9: CLIMA & SENSORES (6)
// ============================================================================

export const IconThermometer: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M30 25.76V8C30 4.69 27.31 2 24 2C20.69 2 18 4.69 18 8V25.76C14.79 27.97 13 31.64 13 35.5C13 41.85 18.15 47 24.5 47C30.85 47 36 41.85 36 35.5C36 31.64 33.21 27.97 30 25.76Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="35" r="6" fill={fill} opacity="0.3"/>
      <path d="M24 18V28" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export const IconWind: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M4 24H30C33.31 24 36 21.31 36 18C36 14.69 33.31 12 30 12C28.34 12 26.84 12.68 25.76 13.76" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 16H22C24.21 16 26 14.21 26 12C26 9.79 24.21 8 22 8C20.9 8 19.9 8.45 19.17 9.17" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 32H34C37.31 32 40 34.69 40 38C40 41.31 37.31 44 34 44C31.79 44 29.88 42.73 28.98 40.87" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export const IconCloud: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M36 36H12C6.48 36 2 31.52 2 26C2 20.48 6.48 16 12 16C12.26 16 12.52 16.01 12.78 16.03C14.58 10.23 19.95 6 26.33 6C34.07 6 40.33 12.27 40.33 20C40.33 20.34 40.32 20.67 40.29 21C43.62 22.31 46 25.49 46 29.25C46 34.08 41.97 38 37 38" stroke={stroke} strokeWidth="2" fill="none"/>
    </svg>
  )
}

export const IconCloudRain: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M34 28H12C7.58 28 4 24.42 4 20C4 15.58 7.58 12 12 12C12.22 12 12.44 12.01 12.66 12.03C14.18 7.53 18.54 4 23.78 4C30.32 4 35.62 9.31 35.62 15.85C35.62 16.14 35.61 16.42 35.58 16.7C38.4 17.81 40.41 20.5 40.41 23.68C40.41 27.76 37.08 31.09 33 31.09" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M16 34V42" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 36V44" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M32 34V42" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export const IconActivity: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M4 24H12L18 8L24 40L30 16L36 24H44" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

export const IconGauge: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 42C35.05 42 44 33.05 44 22C44 10.95 35.05 2 24 2C12.95 2 4 10.95 4 22C4 33.05 12.95 42 24 42Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M24 22L32 14" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="24" cy="22" r="3" fill={fill}/>
      <path d="M12 30L16 26" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M36 30L32 26" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// ============================================================================
// CATEGORIA 10: GRÁFICOS & DADOS (8)
// ============================================================================

export const IconTrendingUp: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M4 36L18 22L26 30L44 12" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32 12H44V24" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export const IconTrendingDown: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M4 12L18 26L26 18L44 36" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32 36H44V24" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export const IconDollarSign: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M24 10V38" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M30 16H21C18.24 16 16 18.24 16 21C16 23.76 18.24 26 21 26H27C29.76 26 32 28.24 32 31C32 33.76 29.76 36 27 36H16" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export const IconTarget: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="24" r="12" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <circle cx="24" cy="24" r="6" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <circle cx="24" cy="24" r="2" fill={fill}/>
    </svg>
  )
}

export const IconBrain: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 44V24" stroke={stroke} strokeWidth="2"/>
      <path d="M12 18C8.69 18 6 20.69 6 24C6 27.31 8.69 30 12 30" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M36 18C39.31 18 42 20.69 42 24C42 27.31 39.31 30 36 30" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M16 8C12.69 8 10 10.69 10 14C10 16.39 11.39 18.47 13.42 19.49" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M32 8C35.31 8 38 10.69 38 14C38 16.39 36.61 18.47 34.58 19.49" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M18 36C14.69 36 12 33.31 12 30" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M30 36C33.31 36 36 33.31 36 30" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="8" r="4" stroke={stroke} strokeWidth="2" fill="none"/>
    </svg>
  )
}

export const IconLayers: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4L4 16L24 28L44 16L24 4Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M4 24L24 36L44 24" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M4 32L24 44L44 32" stroke={stroke} strokeWidth="2" fill="none"/>
    </svg>
  )
}

export const IconStar: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4L29.76 17.52L44 19.24L33.64 29.24L36.36 43.36L24 36.28L11.64 43.36L14.36 29.24L4 19.24L18.24 17.52L24 4Z" stroke={stroke} strokeWidth="2" fill="none"/>
    </svg>
  )
}

export const IconHash: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M8 18H40" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M8 30H40" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M18 6L14 42" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M34 6L30 42" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

// ============================================================================
// CATEGORIA 11: COMUNICAÇÃO (6)
// ============================================================================

export const IconPhone: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M44 34.92V40.92C44 42.5 42.74 43.84 41.17 43.98C39.28 44.16 37.43 44 35.64 43.52C29.64 41.88 24.16 38.72 19.72 34.28C15.28 29.84 12.12 24.36 10.48 18.36C10 16.57 9.84 14.72 10.02 12.83C10.16 11.26 11.5 10 13.08 10H19.08C20.46 10 21.66 11 21.9 12.36C22.12 13.54 22.46 14.7 22.9 15.8C23.26 16.7 23.04 17.72 22.34 18.42L19.76 21C21.88 25.74 26.26 30.12 31 32.24L33.58 29.66C34.28 28.96 35.3 28.74 36.2 29.1C37.3 29.54 38.46 29.88 39.64 30.1C41 30.34 42 31.54 42 32.92V34.92H44Z" stroke={stroke} strokeWidth="2" fill="none"/>
    </svg>
  )
}

export const IconMail: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="10" width="40" height="28" rx="4" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M4 14L24 28L44 14" stroke={stroke} strokeWidth="2"/>
    </svg>
  )
}

export const IconSend: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M44 4L20 28" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M44 4L30 44L20 28L4 18L44 4Z" stroke={stroke} strokeWidth="2" fill="none"/>
    </svg>
  )
}

export const IconUser: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="14" r="10" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M6 44C6 34.06 14.06 26 24 26C33.94 26 42 34.06 42 44" stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none"/>
      <circle cx="24" cy="14" r="4" fill={fill} opacity="0.3"/>
    </svg>
  )
}

export const IconUserCheck: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="20" cy="14" r="10" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M4 44C4 34.06 11.16 26 20 26C23.28 26 26.36 26.88 28.98 28.44" stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M32 36L36 40L46 30" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export const IconBuilding: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="8" y="8" width="32" height="36" rx="2" stroke={stroke} strokeWidth="2" fill="none"/>
      <rect x="14" y="14" width="6" height="6" rx="1" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="28" y="14" width="6" height="6" rx="1" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="14" y="26" width="6" height="6" rx="1" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="28" y="26" width="6" height="6" rx="1" stroke={stroke} strokeWidth="1.5" fill="none"/>
      <rect x="20" y="36" width="8" height="8" rx="1" fill={fill} opacity="0.3"/>
    </svg>
  )
}

// ============================================================================
// CATEGORIA 12: DIVERSOS (6)
// ============================================================================

export const IconRoute: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="12" cy="12" r="6" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="36" cy="36" r="6" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M18 12H30C33.31 12 36 14.69 36 18V30" stroke={stroke} strokeWidth="2"/>
      <circle cx="12" cy="12" r="2" fill={fill}/>
      <circle cx="36" cy="36" r="2" fill={fill}/>
    </svg>
  )
}

export const IconList: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <line x1="16" y1="12" x2="40" y2="12" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="24" x2="40" y2="24" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="36" x2="40" y2="36" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="8" cy="12" r="2" fill={fill}/>
      <circle cx="8" cy="24" r="2" fill={fill}/>
      <circle cx="8" cy="36" r="2" fill={fill}/>
    </svg>
  )
}

export const IconClipboardList: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M32 8H36C38.21 8 40 9.79 40 12V40C40 42.21 38.21 44 36 44H12C9.79 44 8 42.21 8 40V12C8 9.79 9.79 8 12 8H16" stroke={stroke} strokeWidth="2" fill="none"/>
      <rect x="16" y="4" width="16" height="8" rx="2" stroke={stroke} strokeWidth="2" fill="none"/>
      <line x1="16" y1="22" x2="32" y2="22" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="16" y1="30" x2="28" y2="30" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
      <line x1="16" y1="38" x2="24" y2="38" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

export const IconPalette: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C25.66 44 27 42.66 27 41C27 40.2 26.7 39.48 26.22 38.94C25.74 38.4 25.46 37.7 25.46 36.92C25.46 35.26 26.8 33.92 28.46 33.92H32C38.62 33.92 44 28.54 44 21.92C44 11.84 35.05 4 24 4Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <circle cx="14" cy="20" r="3" fill={fill}/>
      <circle cx="22" cy="14" r="3" fill={fill} opacity="0.7"/>
      <circle cx="32" cy="16" r="3" fill={fill} opacity="0.5"/>
      <circle cx="14" cy="30" r="3" fill={fill} opacity="0.8"/>
    </svg>
  )
}

export const IconNavigation: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M6 24L24 6L42 24L24 42L6 24Z" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M24 16V32" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 24H32" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export const IconPlay: React.FC<IconProps> = ({ size = 24, className, gradient, color }) => {
  const stroke = getStroke(gradient, color)
  const fill = getFill(gradient, color)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth="2" fill="none"/>
      <path d="M20 16L34 24L20 32V16Z" stroke={stroke} strokeWidth="2" fill={fill} opacity="0.3"/>
    </svg>
  )
}

// ============================================================================
// STATUS ICONS (colored)
// ============================================================================

export const IconStatusActive: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="24" r="18" stroke="#00C853" strokeWidth="2" fill="none"/>
    <circle cx="24" cy="24" r="8" fill="#00C853" fillOpacity="0.3"/>
    <circle cx="24" cy="24" r="4" fill="#00C853"/>
  </svg>
)

export const IconStatusInactive: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="24" r="18" stroke="#FF5252" strokeWidth="2" fill="none"/>
    <path d="M16 16L32 32" stroke="#FF5252" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M32 16L16 32" stroke="#FF5252" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
)

export const IconStatusPending: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="24" r="18" stroke="#FFB300" strokeWidth="2" fill="none"/>
    <path d="M24 12V24L32 28" stroke="#FFB300" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// ============================================================================
// ICON MAP - Easy access by name
// ============================================================================

export const Icons = {
  // Navigation
  dashboard: IconDashboard,
  package: IconPackage,
  assets: IconAssets,
  scanLine: IconScanLine,
  scanner: IconScanner,
  mapPin: IconMapPin,
  map: IconMap,
  wrench: IconWrench,
  interventions: IconInterventions,
  bookOpen: IconBookOpen,
  catalog: IconCatalog,
  hardHat: IconHardHat,
  technicians: IconTechnicians,
  fileText: IconFileText,
  reports: IconReports,
  barChart3: IconBarChart3,
  analytics: IconAnalytics,
  users: IconUsers,
  building2: IconBuilding2,
  tenants: IconTenants,
  settings: IconSettings,

  // UI Controls
  menu: IconMenu,
  chevronLeft: IconChevronLeft,
  chevronRight: IconChevronRight,
  chevronUp: IconChevronUp,
  chevronDown: IconChevronDown,
  sun: IconSun,
  moon: IconMoon,
  logOut: IconLogOut,
  logout: IconLogout,
  bell: IconBell,
  globe: IconGlobe,
  search: IconSearch,
  filter: IconFilter,
  rotateCcw: IconRotateCcw,
  refresh: IconRefresh,
  refreshCw: IconRefreshCw,

  // Status & Alerts
  checkCircle: IconCheckCircle,
  check: IconCheck,
  xCircle: IconXCircle,
  close: IconClose,
  alertTriangle: IconAlertTriangle,
  warning: IconWarning,
  alertCircle: IconAlertCircle,
  info: IconInfo,

  // Actions
  save: IconSave,
  trash2: IconTrash2,
  trash: IconTrash,
  edit: IconEdit,
  x: IconX,
  plus: IconPlus,
  arrowLeft: IconArrowLeft,
  copy: IconCopy,
  loader2: IconLoader2,
  moreHorizontal: IconMoreHorizontal,

  // Files
  upload: IconUpload,
  download: IconDownload,
  file: IconFile,
  image: IconImage,
  folderOpen: IconFolderOpen,
  fileSpreadsheet: IconFileSpreadsheet,

  // Scanner
  qrCode: IconQrCode,
  barcode: IconBarcode,
  camera: IconCamera,
  history: IconHistory,
  crosshair: IconCrosshair,

  // Time & Security
  clock: IconClock,
  calendar: IconCalendar,
  shield: IconShield,
  shieldCheck: IconShieldCheck,
  lock: IconLock,
  key: IconKey,
  crown: IconCrown,
  eye: IconEye,

  // Equipment
  lightbulb: IconLightbulb,
  zap: IconZap,
  box: IconBox,
  antenna: IconAntenna,
  car: IconCar,
  monitor: IconMonitor,
  cpu: IconCpu,
  columns: IconColumns,
  database: IconDatabase,
  data: IconData,
  hardDrive: IconHardDrive,

  // Climate & Sensors
  thermometer: IconThermometer,
  wind: IconWind,
  cloud: IconCloud,
  cloudRain: IconCloudRain,
  activity: IconActivity,
  gauge: IconGauge,

  // Charts & Data
  trendingUp: IconTrendingUp,
  trendingDown: IconTrendingDown,
  dollarSign: IconDollarSign,
  target: IconTarget,
  brain: IconBrain,
  layers: IconLayers,
  star: IconStar,
  hash: IconHash,

  // Communication
  phone: IconPhone,
  mail: IconMail,
  send: IconSend,
  user: IconUser,
  userCheck: IconUserCheck,
  building: IconBuilding,

  // Misc
  route: IconRoute,
  list: IconList,
  clipboardList: IconClipboardList,
  palette: IconPalette,
  navigation: IconNavigation,
  play: IconPlay,

  // Status
  statusActive: IconStatusActive,
  statusInactive: IconStatusInactive,
  statusPending: IconStatusPending,
}

export type IconName = keyof typeof Icons
