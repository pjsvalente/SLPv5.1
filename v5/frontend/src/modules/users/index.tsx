import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FormField } from '@/components/ui/FormField'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useLanguage } from '@/hooks/useLanguage'
import {
  IconPlus, IconArrowLeft, IconSave, IconLoader, IconTrash,
  IconKey, IconShield, IconShieldCheck, IconGradientDefs
} from '@/components/icons'

interface User {
  id: number
  email: string
  first_name?: string
  last_name?: string
  role: string
  active: boolean
  two_factor_enabled: boolean
  created_at: string
  last_login?: string
}

// User List Component
const UsersList: React.FC = () => {
  const { t } = useTranslation()
  const { formatDate } = useLanguage()
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await api.get('/users')
      setUsers(data.users || data || [])
    } catch (err: any) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const term = search.toLowerCase()
    return (
      user.email.toLowerCase().includes(term) ||
      (user.first_name?.toLowerCase() || '').includes(term) ||
      (user.last_name?.toLowerCase() || '').includes(term)
    )
  })

  const columns = [
    {
      key: 'email',
      label: t('users.email'),
      sortable: true,
      render: (value: string, row: User) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{value}</div>
          {(row.first_name || row.last_name) && (
            <div className="text-sm text-gray-500">{row.first_name} {row.last_name}</div>
          )}
        </div>
      )
    },
    {
      key: 'role',
      label: t('users.role'),
      render: (value: string) => <StatusBadge status={value} />
    },
    {
      key: 'active',
      label: t('common.status'),
      render: (value: boolean) => (
        <StatusBadge status={value ? 'active' : 'inactive'} />
      )
    },
    {
      key: 'two_factor_enabled',
      label: '2FA',
      render: (value: boolean) => (
        value ? (
          <IconShieldCheck className="h-5 w-5 text-green-600" />
        ) : (
          <IconShield className="h-5 w-5 text-gray-400" />
        )
      )
    },
    {
      key: 'last_login',
      label: t('users.lastLogin'),
      render: (value: string) => value ? formatDate(value) : t('common.none')
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('users.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {users.length} {t('users.title').toLowerCase()}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <DataTable
        data={filteredUsers}
        columns={columns}
        loading={loading}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={`${t('common.search')} ${t('users.email').toLowerCase()}...`}
        onRowClick={(user) => navigate(`/users/${user.id}`)}
        emptyMessage={t('table.noResults')}
        actions={
          <button
            onClick={() => navigate('/users/new')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <IconPlus className="h-5 w-5 mr-2" />
            {t('users.newUser')}
          </button>
        }
      />
    </div>
  )
}

// User Form Component
const UserForm: React.FC<{ mode: 'create' | 'edit' }> = ({ mode }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId } = useParams()
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'user',
    password: '',
    confirm_password: ''
  })

  useEffect(() => {
    if (mode === 'edit' && userId) {
      loadUser()
    }
  }, [mode, userId])

  const loadUser = async () => {
    try {
      const data = await api.get(`/users/${userId}`)
      setFormData({
        email: data.email || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        role: data.role || 'user',
        password: '',
        confirm_password: ''
      })
    } catch (err: any) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'create' && formData.password !== formData.confirm_password) {
      setError(t('errors.PASSWORDS_DONT_MATCH'))
      return
    }

    if (mode === 'create' && formData.password.length < 8) {
      setError(t('errors.PASSWORD_TOO_SHORT'))
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload: any = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        role: formData.role
      }

      if (mode === 'create') {
        payload.password = formData.password
        await api.post('/users', payload)
        setSuccess(t('users.userCreated'))
      } else {
        await api.put(`/users/${userId}`, payload)
        setSuccess(t('users.userUpdated'))
      }

      setTimeout(() => navigate('/users'), 1500)
    } catch (err: any) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <IconArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {mode === 'create' ? t('users.newUser') : t('users.editUser')}
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('users.userDetails')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label={t('users.email')}
              name="email"
              type="email"
              value={formData.email}
              onChange={(v) => handleChange('email', v)}
              required
              disabled={mode === 'edit'}
            />
            <FormField
              label={t('users.role')}
              name="role"
              type="select"
              value={formData.role}
              onChange={(v) => handleChange('role', v)}
              options={[
                { value: 'user', label: t('users.roles.viewer') },
                { value: 'operator', label: t('users.roles.technician') },
                { value: 'admin', label: t('users.roles.admin') },
                { value: 'superadmin', label: 'Super Admin' }
              ]}
              required
            />
            <FormField
              label={t('common.name')}
              name="first_name"
              type="text"
              value={formData.first_name}
              onChange={(v) => handleChange('first_name', v)}
            />
            <FormField
              label={t('technicians.fullName')}
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={(v) => handleChange('last_name', v)}
            />
            <FormField
              label={t('technicians.phone')}
              name="phone"
              type="text"
              value={formData.phone}
              onChange={(v) => handleChange('phone', v)}
            />
          </div>
        </div>

        {mode === 'create' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('auth.password')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label={t('auth.password')}
                name="password"
                type="password"
                value={formData.password}
                onChange={(v) => handleChange('password', v)}
                required
              />
              <FormField
                label={t('auth.confirmPassword')}
                name="confirm_password"
                type="password"
                value={formData.confirm_password}
                onChange={(v) => handleChange('confirm_password', v)}
                required
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <IconLoader className="h-4 w-4 mr-2 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              <>
                <IconSave className="h-4 w-4 mr-2" />
                {mode === 'create' ? t('common.create') : t('common.save')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// User Detail Component
const UserDetail: React.FC = () => {
  const { t } = useTranslation()
  const { formatDate } = useLanguage()
  const navigate = useNavigate()
  const { userId } = useParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadUser()
  }, [userId])

  const loadUser = async () => {
    try {
      const data = await api.get(`/users/${userId}`)
      setUser(data)
    } catch (err: any) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      await api.delete(`/users/${userId}`)
      navigate('/users')
    } catch (err: any) {
      setError(err.message || t('errors.SERVER_ERROR'))
      setShowDeleteDialog(false)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setActionLoading(true)
    try {
      await api.post(`/users/${userId}/reset-password`)
      setShowResetDialog(false)
      loadUser()
    } catch (err: any) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggle2FA = async () => {
    setActionLoading(true)
    try {
      await api.post(`/users/${userId}/toggle-2fa`)
      loadUser()
    } catch (err: any) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
        {t('errors.USER_NOT_FOUND')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/users')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <IconArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user.email}</h1>
            <p className="text-gray-500 dark:text-gray-400">{user.first_name} {user.last_name}</p>
            <div className="mt-2 flex gap-2">
              <StatusBadge status={user.role} />
              <StatusBadge status={user.active ? 'active' : 'inactive'} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/users/${userId}/edit`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('common.edit')}
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <IconTrash className="h-4 w-4 mr-2" />
            {t('common.delete')}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('common.info')}</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-gray-500">{t('users.email')}</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">{t('common.name')}</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user.first_name} {user.last_name}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">{t('common.createdAt')}</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatDate(user.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">{t('users.lastLogin')}</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user.last_login ? formatDate(user.last_login) : t('common.none')}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.security')}</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <IconShield className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{t('users.twoFactorEnabled')}</p>
                  <p className="text-sm text-gray-500">
                    {user.two_factor_enabled ? t('common.active') : t('common.inactive')}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggle2FA}
                disabled={actionLoading}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                  user.two_factor_enabled
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {user.two_factor_enabled ? t('common.inactive') : t('common.active')}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <IconKey className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{t('auth.resetPassword')}</p>
                  <p className="text-sm text-gray-500">{t('users.mustChangePassword')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetDialog(true)}
                className="px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg"
              >
                {t('common.reset')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title={t('common.delete')}
        message={t('confirmations.delete')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleResetPassword}
        title={t('auth.resetPassword')}
        message={t('users.mustChangePassword')}
        confirmText={t('common.reset')}
        variant="warning"
        loading={actionLoading}
      />
    </div>
  )
}

const Users: React.FC = () => {
  return (
    <Routes>
      <Route index element={<UsersList />} />
      <Route path="new" element={<UserForm mode="create" />} />
      <Route path=":userId" element={<UserDetail />} />
      <Route path=":userId/edit" element={<UserForm mode="edit" />} />
    </Routes>
  )
}

export default Users
