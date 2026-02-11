import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AssetForm } from './AssetForm'
import { AssetDetail } from './AssetDetail'
import { IconPlus, IconPackage, IconGradientDefs } from '@/components/icons'
import { useLanguage } from '@/hooks/useLanguage'

interface Asset {
  id: number
  serial_number: string
  created_at: string
  status?: string
  product_reference?: string
  installation_location?: string
  condition_status?: string
  [key: string]: any
}

interface Pagination {
  page: number
  per_page: number
  total: number
  pages: number
}

const AssetsList: React.FC = () => {
  const { t } = useTranslation()
  const { formatDate } = useLanguage()
  const navigate = useNavigate()
  const [assets, setAssets] = useState<Asset[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadAssets()
  }, [page])

  const loadAssets = async (searchTerm?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20'
      })
      const term = searchTerm !== undefined ? searchTerm : search
      if (term) params.append('search', term)

      const data = await api.get(`/assets?${params}`)
      setAssets(data.data || [])
      setPagination(data.pagination)
    } catch (err: any) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
    loadAssets(value)
  }

  const columns = [
    {
      key: 'serial_number',
      label: t('assets.serialNumber'),
      sortable: true,
      render: (value: string) => (
        <span className="font-semibold text-slp-navy dark:text-white">{value}</span>
      )
    },
    {
      key: 'product_reference',
      label: t('catalog.reference'),
      sortable: true,
      render: (value: string) => (
        <span className="text-gray-600 dark:text-gray-400">{value || '-'}</span>
      )
    },
    {
      key: 'installation_location',
      label: t('assets.location'),
      render: (value: string, row: Asset) => (
        <span className="text-gray-600 dark:text-gray-400">{value || row.street_address || '-'}</span>
      )
    },
    {
      key: 'condition_status',
      label: t('common.status'),
      render: (value: string, row: Asset) => {
        const status = value || row.status
        return status ? <StatusBadge status={status} /> : '-'
      }
    },
    {
      key: 'created_at',
      label: t('common.createdAt'),
      sortable: true,
      render: (value: string) => (
        <span className="text-gray-500 dark:text-gray-400 text-sm">{formatDate(value)}</span>
      )
    }
  ]

  return (
    <>
      <IconGradientDefs />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slp-navy dark:text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-slp-cyan to-slp-blue-bright">
                <IconPackage size={24} className="text-white" />
              </div>
              {t('assets.title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {pagination?.total || 0} {t('assets.title').toLowerCase()} {t('common.registered').toLowerCase()}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-2xl">
            {error}
          </div>
        )}

        {/* Table with modern styling */}
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          <DataTable
            data={assets}
            columns={columns}
            loading={loading}
            searchable
            searchValue={search}
            onSearchChange={handleSearch}
            searchPlaceholder={`${t('common.search')} ${t('assets.serialNumber').toLowerCase()}...`}
            onRowClick={(asset) => navigate(`/assets/${asset.serial_number}`)}
            emptyMessage={t('table.noResults')}
            pagination={pagination ? {
              page: pagination.page,
              perPage: pagination.per_page,
              total: pagination.total,
              onPageChange: setPage
            } : undefined}
            actions={
              <button
                onClick={() => navigate('/assets/new')}
                className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-slp-cyan to-slp-blue-bright text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-slp-cyan/30 transition-all duration-300"
              >
                <IconPlus size={20} className="mr-2 group-hover:scale-110 transition-transform" />
                {t('assets.newAsset')}
              </button>
            }
          />
        </div>
      </div>
    </>
  )
}

const Assets: React.FC = () => {
  return (
    <Routes>
      <Route index element={<AssetsList />} />
      <Route path="new" element={<AssetForm mode="create" />} />
      <Route path=":serialNumber" element={<AssetDetail />} />
      <Route path=":serialNumber/edit" element={<AssetForm mode="edit" />} />
    </Routes>
  )
}

export default Assets
