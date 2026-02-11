import { useState, useRef } from 'react'
import { IconUpload, IconX, IconFile, IconImage, IconFileText } from '@/components/icons'
import { useTranslation } from 'react-i18next'

interface UploadedFile {
  id?: number
  name: string
  size: number
  type: string
  url?: string
  file?: File
}

interface FileUploadProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  onFileRemove?: (file: UploadedFile) => void
  accept?: string
  multiple?: boolean
  maxSize?: number // in bytes
  maxFiles?: number
  disabled?: boolean
  label?: string
}

export function FileUpload({
  files,
  onFilesChange,
  onFileRemove,
  accept = '*/*',
  multiple = true,
  maxSize = 3 * 1024 * 1024, // 3MB default
  maxFiles = 10,
  disabled = false,
  label
}: FileUploadProps) {
  const { t } = useTranslation()
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayLabel = label || t('fileUpload.uploadFiles')

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <IconImage className="h-8 w-8 text-blue-500" />
    if (type === 'application/pdf') return <IconFileText className="h-8 w-8 text-red-500" />
    return <IconFile className="h-8 w-8 text-gray-500" />
  }

  const validateFiles = (newFiles: FileList): File[] => {
    const validFiles: File[] = []
    const currentCount = files.length

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i]

      // Check max files
      if (currentCount + validFiles.length >= maxFiles) {
        setError(t('fileUpload.maxFilesError', { count: maxFiles }))
        break
      }

      // Check file size
      if (file.size > maxSize) {
        setError(t('fileUpload.maxSizeError', { name: file.name, size: formatSize(maxSize) }))
        continue
      }

      validFiles.push(file)
    }

    return validFiles
  }

  const handleFiles = (fileList: FileList) => {
    setError(null)
    const validFiles = validateFiles(fileList)

    const newFiles: UploadedFile[] = validFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }))

    onFilesChange([...files, ...newFiles])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = '' // Reset input
    }
  }

  const handleRemove = (index: number) => {
    const file = files[index]
    if (onFileRemove) {
      onFileRemove(file)
    }
    const newFiles = files.filter((_, i) => i !== index)
    onFilesChange(newFiles)
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {displayLabel}
      </label>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
        <IconUpload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('fileUpload.dragAndDrop')} <span className="text-blue-600 dark:text-blue-400">{t('fileUpload.clickToSelect')}</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {t('fileUpload.maxSizePerFile', { size: formatSize(maxSize) })}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatSize(file.size)}
                </p>
              </div>
              {file.url && (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('common.view')}
                </a>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(index)
                }}
                disabled={disabled}
                className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
              >
                <IconX className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
