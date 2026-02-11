/**
 * SmartLamppost v5.0 - Scanner Page
 * Dedicated page for QR/RFID scanning with asset lookup
 */

import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { QRScanner } from '@/components/ui/QRScanner'
import { LoadingSpinner } from '@/core/common/LoadingSpinner'
import {
  QrCode, Barcode, Search, Package, AlertTriangle,
  ChevronRight, Camera, History, MapPin
} from 'lucide-react'

interface ScanHistory {
  code: string
  format: string
  timestamp: Date
  found: boolean
  assetId?: number
  assetName?: string
}

const ScannerPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanMode, setScanMode] = useState<'qr' | 'barcode' | 'all'>('all')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([])

  const handleScan = useCallback(async (code: string, format: string) => {
    setScannerOpen(false)
    setSearching(true)
    setError('')
    setSearchResult(null)

    try {
      // Search for asset by RFID tag or product reference
      const response = await api.get(`/assets/search?q=${encodeURIComponent(code)}`)

      const historyEntry: ScanHistory = {
        code,
        format,
        timestamp: new Date(),
        found: false
      }

      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0]
        setSearchResult(asset)
        historyEntry.found = true
        historyEntry.assetId = asset.id
        historyEntry.assetName = asset.product_reference || asset.rfid_tag
      } else {
        setError(t('scanner.assetNotFound'))
      }

      setScanHistory(prev => [historyEntry, ...prev.slice(0, 9)])

    } catch (err: any) {
      console.error('Search error:', err)
      setError(err.message || t('errors.SERVER_ERROR'))

      setScanHistory(prev => [{
        code,
        format,
        timestamp: new Date(),
        found: false
      }, ...prev.slice(0, 9)])
    } finally {
      setSearching(false)
    }
  }, [t])

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualInput.trim()) return

    await handleScan(manualInput.trim(), 'MANUAL')
    setManualInput('')
  }

  const goToAsset = (assetId: number) => {
    navigate(`/assets/${assetId}`)
  }

  const createNewAsset = (rfidTag: string) => {
    navigate(`/assets/new?rfid=${encodeURIComponent(rfidTag)}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('scanner.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('scanner.description')}
        </p>
      </div>

      {/* Scan Mode Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('scanner.selectMode')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => { setScanMode('all'); setScannerOpen(true) }}
            className="flex flex-col items-center gap-3 p-6 border-2 border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Camera className="h-12 w-12 text-blue-500" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {t('scanner.allCodes')}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 text-center">
              QR + {t('scanner.barcode')}
            </span>
          </button>

          <button
            onClick={() => { setScanMode('qr'); setScannerOpen(true) }}
            className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <QrCode className="h-12 w-12 text-purple-500" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              QR Code
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {t('scanner.qrOnly')}
            </span>
          </button>

          <button
            onClick={() => { setScanMode('barcode'); setScannerOpen(true) }}
            className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <Barcode className="h-12 w-12 text-green-500" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {t('scanner.barcode')}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Code128, EAN, UPC
            </span>
          </button>
        </div>
      </div>

      {/* Manual Input */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('scanner.manualEntry')}
        </h2>

        <form onSubmit={handleManualSearch} className="flex gap-3">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder={t('scanner.enterCode')}
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!manualInput.trim() || searching}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search className="h-5 w-5" />
            {t('common.search')}
          </button>
        </form>
      </div>

      {/* Loading State */}
      {searching && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            {t('scanner.searching')}...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !searching && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-orange-800 dark:text-orange-300">
                {t('scanner.assetNotFound')}
              </h3>
              <p className="mt-1 text-orange-700 dark:text-orange-400 text-sm">
                {t('scanner.notFoundDescription')}
              </p>
              <button
                onClick={() => createNewAsset(scanHistory[0]?.code || '')}
                className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Package className="h-5 w-5" />
                {t('scanner.createNewAsset')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Result */}
      {searchResult && !searching && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <Package className="h-8 w-8 text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 dark:text-green-300 text-lg">
                {t('scanner.assetFound')}
              </h3>

              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{t('assets.rfidTag')}:</span>
                  <span className="font-mono">{searchResult.rfid_tag}</span>
                </div>
                {searchResult.product_reference && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{t('assets.productReference')}:</span>
                    <span>{searchResult.product_reference}</span>
                  </div>
                )}
                {searchResult.condition_status && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{t('assets.condition')}:</span>
                    <span className={`px-2 py-0.5 rounded text-sm ${
                      searchResult.condition_status === 'Operacional'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {searchResult.condition_status}
                    </span>
                  </div>
                )}
                {(searchResult.gps_latitude && searchResult.gps_longitude) && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">
                      {searchResult.gps_latitude.toFixed(6)}, {searchResult.gps_longitude.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => goToAsset(searchResult.id)}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                {t('scanner.viewAsset')}
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('scanner.recentScans')}
            </h2>
          </div>

          <div className="space-y-2">
            {scanHistory.map((item, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  item.found
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.format === 'QR_CODE' ? (
                    <QrCode className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Barcode className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                      {item.code}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.timestamp.toLocaleTimeString()} - {item.format}
                    </p>
                  </div>
                </div>

                {item.found && item.assetId && (
                  <button
                    onClick={() => goToAsset(item.assetId!)}
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                  >
                    {t('common.view')}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        acceptedFormats={scanMode}
        title={
          scanMode === 'qr' ? 'Scan QR Code' :
          scanMode === 'barcode' ? t('scanner.barcode') :
          t('scanner.title')
        }
      />
    </div>
  )
}

export default ScannerPage
