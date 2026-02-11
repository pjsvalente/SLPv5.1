/**
 * SmartLamppost v5.0 - QR/Barcode Scanner Component
 * Uses html5-qrcode library for camera-based scanning
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { IconX, IconCamera, IconRotateCcw, IconFlashlight, IconQrCode, IconBarcode } from '@/components/icons'

interface QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (result: string, format: string) => void
  title?: string
  acceptedFormats?: 'qr' | 'barcode' | 'all'
}

export const QRScanner: React.FC<QRScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title,
  acceptedFormats = 'all'
}) => {
  const { t } = useTranslation()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string>('')
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [hasFlash, setHasFlash] = useState(false)
  const [flashOn, setFlashOn] = useState(false)
  const [lastScanned, setLastScanned] = useState<string>('')

  // Define supported formats based on prop
  const getFormats = useCallback(() => {
    const qrFormats = [Html5QrcodeSupportedFormats.QR_CODE]
    const barcodeFormats = [
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.CODABAR
    ]

    if (acceptedFormats === 'qr') return qrFormats
    if (acceptedFormats === 'barcode') return barcodeFormats
    return [...qrFormats, ...barcodeFormats]
  }, [acceptedFormats])

  // Initialize cameras list
  useEffect(() => {
    if (isOpen) {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            const cameraList = devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id}` }))
            setCameras(cameraList)
            // Prefer back camera
            const backCamera = cameraList.find(c =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('traseira') ||
              c.label.toLowerCase().includes('environment')
            )
            setSelectedCamera(backCamera?.id || cameraList[0].id)
          } else {
            setError(t('scanner.noCameraFound'))
          }
        })
        .catch((err) => {
          console.error('Error getting cameras:', err)
          setError(t('scanner.cameraAccessDenied'))
        })
    }
  }, [isOpen, t])

  // Start scanning when camera is selected
  useEffect(() => {
    if (!isOpen || !selectedCamera || !containerRef.current) return

    const startScanner = async () => {
      try {
        setError('')
        setIsScanning(true)

        if (scannerRef.current) {
          await scannerRef.current.stop()
        }

        const scanner = new Html5Qrcode('qr-scanner-container', {
          formatsToSupport: getFormats(),
          verbose: false
        })
        scannerRef.current = scanner

        await scanner.start(
          selectedCamera,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText, result) => {
            // Prevent duplicate scans
            if (decodedText !== lastScanned) {
              setLastScanned(decodedText)
              const format = result.result.format?.formatName || 'UNKNOWN'

              // Vibrate on success if available
              if (navigator.vibrate) {
                navigator.vibrate(100)
              }

              onScan(decodedText, format)
            }
          },
          () => {
            // Ignore scan errors (continuous scanning)
          }
        )

        // Check for flash capability
        try {
          const track = scanner.getRunningTrackSettings()
          // @ts-ignore - torch may not be in types
          setHasFlash(!!track?.torch)
        } catch {
          setHasFlash(false)
        }

      } catch (err: any) {
        console.error('Scanner start error:', err)
        setIsScanning(false)
        if (err.message?.includes('Permission')) {
          setError(t('scanner.cameraAccessDenied'))
        } else {
          setError(t('scanner.startError'))
        }
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [isOpen, selectedCamera, getFormats, onScan, lastScanned, t])

  // Cleanup on close
  useEffect(() => {
    if (!isOpen && scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
      setIsScanning(false)
      setLastScanned('')
    }
  }, [isOpen])

  const handleCameraSwitch = () => {
    const currentIndex = cameras.findIndex(c => c.id === selectedCamera)
    const nextIndex = (currentIndex + 1) % cameras.length
    setSelectedCamera(cameras[nextIndex].id)
  }

  const toggleFlash = async () => {
    if (!scannerRef.current || !hasFlash) return

    try {
      // @ts-ignore - applyVideoConstraints and torch property may not be in types
      await scannerRef.current.applyVideoConstraints({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        advanced: [{ torch: !flashOn } as any]
      })
      setFlashOn(!flashOn)
    } catch (err) {
      console.error('Flash toggle error:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2 text-white">
          {acceptedFormats === 'qr' ? (
            <IconQrCode className="h-6 w-6" />
          ) : acceptedFormats === 'barcode' ? (
            <IconBarcode className="h-6 w-6" />
          ) : (
            <IconCamera className="h-6 w-6" />
          )}
          <span className="font-medium">
            {title || t('scanner.title')}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <IconX className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Scanner viewport */}
      <div className="flex items-center justify-center h-full">
        <div
          id="qr-scanner-container"
          ref={containerRef}
          className="w-full max-w-md aspect-square"
        />
      </div>

      {/* Scanning overlay */}
      {isScanning && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-64 relative">
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
            {/* Scanning line animation */}
            <div className="absolute inset-x-4 h-0.5 bg-blue-500 animate-scan" />
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-20 left-4 right-4 p-4 bg-red-500/90 text-white rounded-lg text-center">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-center gap-6">
          {/* Switch camera button */}
          {cameras.length > 1 && (
            <button
              onClick={handleCameraSwitch}
              className="p-4 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title={t('scanner.switchCamera')}
            >
              <IconRotateCcw className="h-6 w-6 text-white" />
            </button>
          )}

          {/* Flash button */}
          {hasFlash && (
            <button
              onClick={toggleFlash}
              className={`p-4 rounded-full transition-colors ${
                flashOn ? 'bg-yellow-500' : 'bg-white/20 hover:bg-white/30'
              }`}
              title={t('scanner.toggleFlash')}
            >
              <IconFlashlight className={`h-6 w-6 ${flashOn ? 'text-black' : 'text-white'}`} />
            </button>
          )}
        </div>

        {/* Instructions */}
        <p className="mt-4 text-center text-white/80 text-sm">
          {acceptedFormats === 'qr'
            ? t('scanner.pointAtQR')
            : acceptedFormats === 'barcode'
            ? t('scanner.pointAtBarcode')
            : t('scanner.pointAtCode')}
        </p>

        {/* Last scanned indicator */}
        {lastScanned && (
          <div className="mt-2 p-2 bg-green-500/80 rounded-lg text-center">
            <p className="text-white text-sm font-mono truncate">{lastScanned}</p>
          </div>
        )}
      </div>

      {/* Scanning animation styles */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; opacity: 0.5; }
          50% { top: 85%; opacity: 1; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default QRScanner
