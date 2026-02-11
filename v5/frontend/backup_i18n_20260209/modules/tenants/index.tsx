/**
 * SmartLamppost v5.0 - Tenants Module
 * Multi-tenant management (superadmin only)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApi } from '@/hooks/useApi'
import { DataTable, FormField, ConfirmDialog, StatusBadge, FileUpload } from '@/components/ui'
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  Users,
  Package,
  ArrowLeft,
  Save,
  X,
  Upload,
  Image,
  Crown,
  Shield,
  Settings2
} from 'lucide-react'

// Types
interface Tenant {
  id: string
  name: string
  short_name: string
  plan: string
  plan_name: string
  is_master: boolean
  active: boolean
  created_at: string
  user_count: number
  asset_count: number
  settings?: Record<string, any>
  branding?: Record<string, any>
}

// Main component with routing
export default function TenantsModule() {
  return (
    <Routes>
      <Route index element={<TenantsList />} />
      <Route path="new" element={<TenantForm />} />
      <Route path=":id" element={<TenantDetail />} />
      <Route path=":id/edit" element={<TenantForm />} />
    </Routes>
  )
}

// List Component
function TenantsList() {
  const navigate = useNavigate()
  const api = useApi()
  const { t } = useTranslation()

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tenant: Tenant | null }>({
    open: false,
    tenant: null
  })

  const loadTenants = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/tenants')
      setTenants(data || [])
    } catch (error) {
      console.error('Error loading tenants:', error)
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    loadTenants()
  }, [loadTenants])

  const handleToggleActive = async (tenant: Tenant) => {
    try {
      await api.put(`/tenants/${tenant.id}`, { active: !tenant.active })
      loadTenants()
    } catch (error: any) {
      alert(error.message || t('tenants.errorUpdatingTenant'))
    }
  }

  const columns = [
    {
      key: 'name',
      label: t('common.name'),
      sortable: true,
      render: (_value: any, tenant: Tenant) => (
        <div className="flex items-center gap-3">
          <img
            src={`/api/tenants/${tenant.id}/logo?t=${Date.now()}`}
            alt={tenant.name}
            className="w-10 h-10 object-contain rounded border border-gray-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ccc"><rect width="24" height="24"/></svg>'
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{tenant.name}</span>
              {tenant.is_master && (
                <Crown className="w-4 h-4 text-yellow-500" title={t('tenants.tenantMaster')} />
              )}
            </div>
            <span className="text-sm text-gray-500">{tenant.id}</span>
          </div>
        </div>
      )
    },
    {
      key: 'plan',
      label: t('tenants.plan'),
      sortable: true,
      render: (_value: any, tenant: Tenant) => (
        <StatusBadge
          status={tenant.plan}
          colorMap={{
            base: 'gray',
            pro: 'blue',
            premium: 'purple',
            enterprise: 'gold'
          }}
        />
      )
    },
    {
      key: 'user_count',
      label: t('navigation.users'),
      sortable: true,
      render: (_value: any, tenant: Tenant) => (
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-gray-400" />
          <span>{tenant.user_count}</span>
        </div>
      )
    },
    {
      key: 'asset_count',
      label: t('navigation.assets'),
      sortable: true,
      render: (_value: any, tenant: Tenant) => (
        <div className="flex items-center gap-1">
          <Package className="w-4 h-4 text-gray-400" />
          <span>{tenant.asset_count}</span>
        </div>
      )
    },
    {
      key: 'active',
      label: t('common.status'),
      render: (_value: any, tenant: Tenant) => (
        <StatusBadge
          status={tenant.active ? t('common.active') : t('common.inactive')}
          colorMap={{ [t('common.active')]: 'green', [t('common.inactive')]: 'gray' }}
        />
      )
    },
    {
      key: 'created_at',
      label: t('common.createdAt'),
      sortable: true,
      render: (_value: any, tenant: Tenant) => new Date(tenant.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (_value: any, tenant: Tenant) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/tenants/${tenant.id}/edit`) }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title={t('common.edit')}
          >
            <Edit className="w-4 h-4" />
          </button>
          {!tenant.is_master && (
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleActive(tenant) }}
              className={`p-1 rounded ${tenant.active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
              title={tenant.active ? t('common.inactive') : t('common.active')}
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('tenants.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('tenants.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/plans')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Settings2 className="w-4 h-4" />
            {t('tenants.configurePlans')}
          </button>
          <button
            onClick={() => navigate('/tenants/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {t('tenants.newTenant')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('tenants.totalTenants')}</p>
              <p className="text-xl font-bold">{tenants.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('tenants.activeTenants')}</p>
              <p className="text-xl font-bold">{tenants.filter(t => t.active).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('tenants.totalUsers')}</p>
              <p className="text-xl font-bold">{tenants.reduce((sum, t) => sum + t.user_count, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={tenants}
        loading={loading}
        onRowClick={(tenant) => navigate(`/tenants/${tenant.id}`)}
        emptyMessage={t('tenants.noTenantFound')}
      />
    </div>
  )
}

// Form Component
function TenantForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const api = useApi()
  const { t } = useTranslation()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    short_name: '',
    plan: 'base',
    active: true,
    admin_email: '',
    admin_password: ''
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (isEdit) {
      loadTenant()
    }
  }, [id])

  const loadTenant = async () => {
    setLoading(true)
    try {
      const data = await api.get(`/tenants/${id}`)
      setFormData({
        id: data.id || '',
        name: data.name || '',
        short_name: data.short_name || '',
        plan: data.plan || 'base',
        active: data.active !== false,
        admin_email: '',
        admin_password: ''
      })
      setLogoPreview(`/api/tenants/${id}/logo?t=${Date.now()}`)
    } catch (error) {
      console.error('Error loading tenant:', error)
      navigate('/tenants')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert(t('tenants.nameRequired'))
      return
    }

    if (!isEdit && !formData.id.trim()) {
      alert(t('tenants.idRequired'))
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/tenants/${id}`, {
          name: formData.name,
          short_name: formData.short_name,
          plan: formData.plan,
          active: formData.active
        })
      } else {
        await api.post('/tenants', {
          id: formData.id.toLowerCase().replace(/\s+/g, '_'),
          name: formData.name,
          short_name: formData.short_name || formData.name.substring(0, 3).toUpperCase(),
          plan: formData.plan,
          admin_email: formData.admin_email || undefined,
          admin_password: formData.admin_password || undefined
        })
      }
      navigate('/tenants')
    } catch (error: any) {
      alert(error.message || t('tenants.errorSavingTenant'))
    } finally {
      setSaving(false)
    }
  }

  const [logoFiles, setLogoFiles] = useState<any[]>([])

  const handleLogoUpload = async (files: any[]) => {
    if (files.length === 0 || !isEdit) return

    // Get the actual File object
    const fileData = files[files.length - 1]
    const file = fileData.file

    if (!file || !file.type.startsWith('image/')) {
      alert(t('tenants.selectImage'))
      return
    }

    setUploadingLogo(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const response = await fetch(`/api/tenants/${id}/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: uploadFormData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('tenants.errorSendingLogo'))
      }

      setLogoPreview(`/api/tenants/${id}/logo?t=${Date.now()}`)
      setLogoFiles([]) // Clear file list after successful upload
    } catch (error: any) {
      alert(error.message || t('tenants.errorSendingLogo'))
    } finally {
      setUploadingLogo(false)
    }
  }

  // Handle file selection
  const handleFilesChange = (files: any[]) => {
    setLogoFiles(files)
    if (files.length > 0) {
      handleLogoUpload(files)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/tenants')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEdit ? t('tenants.editTenant') : t('tenants.newTenant')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isEdit ? t('tenants.alterTenantData') : t('tenants.createNewOrganization')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!isEdit && (
              <FormField
                name="id"
                label={t('tenants.uniqueIdentifier')}
                type="text"
                value={formData.id}
                onChange={(value) => setFormData(prev => ({ ...prev, id: value }))}
                required
                placeholder="ex: empresa_abc"
              />
            )}

            <FormField
              name="name"
              label={t('common.name')}
              type="text"
              value={formData.name}
              onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
              required
              placeholder={t('tenants.organizationName')}
            />

            <FormField
              name="short_name"
              label={t('tenants.shortName')}
              type="text"
              value={formData.short_name}
              onChange={(value) => setFormData(prev => ({ ...prev, short_name: value }))}
              placeholder="ABC"
            />

            <FormField
              name="plan"
              label={t('tenants.plan')}
              type="select"
              value={formData.plan}
              onChange={(value) => setFormData(prev => ({ ...prev, plan: String(value) }))}
              options={[
                { value: 'base', label: t('tenants.plans.base') },
                { value: 'pro', label: t('tenants.plans.pro') },
                { value: 'premium', label: t('tenants.plans.premium') },
                { value: 'enterprise', label: t('tenants.plans.enterprise') }
              ]}
            />

            {!isEdit && (
              <>
                <FormField
                  name="admin_email"
                  label={t('tenants.adminEmail')}
                  type="text"
                  value={formData.admin_email}
                  onChange={(value) => setFormData(prev => ({ ...prev, admin_email: value }))}
                  placeholder="admin@empresa.com"
                />

                <FormField
                  name="admin_password"
                  label={t('tenants.initialPassword')}
                  type="text"
                  value={formData.admin_password}
                  onChange={(value) => setFormData(prev => ({ ...prev, admin_password: value }))}
                  placeholder={t('tenants.temporaryPassword')}
                />
              </>
            )}

            {isEdit && (
              <FormField
                name="active"
                label={t('common.active')}
                type="checkbox"
                value={formData.active}
                onChange={(value) => setFormData(prev => ({ ...prev, active: value }))}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/tenants')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>

        {/* Logo Upload */}
        {isEdit && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Image className="w-5 h-5" />
              {t('tenants.logo')}
            </h2>

            {logoPreview && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="max-h-32 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}

            <FileUpload
              files={logoFiles}
              onFilesChange={handleFilesChange}
              accept="image/png,image/jpeg,image/jpg"
              multiple={false}
              maxFiles={1}
              label={t('tenants.uploadLogo')}
            />

            {uploadingLogo && (
              <div className="mt-2 text-sm text-blue-600">{t('tenants.sending')}</div>
            )}

            <p className="mt-2 text-xs text-gray-500">
              {t('tenants.acceptedFormats')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Detail Component
function TenantDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const api = useApi()
  const { t } = useTranslation()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [tenantData, usersData] = await Promise.all([
        api.get(`/tenants/${id}`),
        api.get(`/tenants/${id}/users`).catch(() => [])
      ])
      setTenant(tenantData)
      setUsers(usersData || [])
    } catch (error) {
      console.error('Error loading tenant:', error)
      navigate('/tenants')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!tenant) return null

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
          <div className="flex items-center gap-4">
            <img
              src={`/api/tenants/${tenant.id}/logo?t=${Date.now()}`}
              alt={tenant.name}
              className="w-16 h-16 object-contain rounded border border-gray-200"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tenant.name}
                </h1>
                {tenant.is_master && (
                  <Crown className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge
                  status={tenant.plan}
                  colorMap={{ base: 'gray', pro: 'blue', premium: 'purple', enterprise: 'gold' }}
                />
                <StatusBadge
                  status={tenant.active ? t('common.active') : t('common.inactive')}
                  colorMap={{ [t('common.active')]: 'green', [t('common.inactive')]: 'gray' }}
                />
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/tenants/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Edit className="w-4 h-4" />
          {t('common.edit')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">{t('tenants.information')}</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">ID</dt>
              <dd className="font-mono">{tenant.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">{t('tenants.shortName')}</dt>
              <dd>{tenant.short_name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">{t('common.createdAt')}</dt>
              <dd>{new Date(tenant.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">{t('tenants.statistics')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{tenant.user_count}</p>
              <p className="text-sm text-gray-500">{t('navigation.users')}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{tenant.asset_count}</p>
              <p className="text-sm text-gray-500">{t('navigation.assets')}</p>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">{t('navigation.users')}</h2>
          {users.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">{t('tenants.noUsers')}</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.slice(0, 10).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <div>
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                  <StatusBadge
                    status={user.active ? t('common.active') : t('common.inactive')}
                    colorMap={{ [t('common.active')]: 'green', [t('common.inactive')]: 'gray' }}
                  />
                </div>
              ))}
              {users.length > 10 && (
                <p className="text-sm text-gray-500 text-center">
                  {t('tenants.moreUsers', { count: users.length - 10 })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
