/**
 * SmartLamppost v5.0 - Technicians Module
 * Technician management for interventions
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApi } from '@/hooks/useApi'
import { DataTable, FormField, ConfirmDialog, StatusBadge } from '@/components/ui'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconUser,
  IconBuilding,
  IconPhone,
  IconMail,
  IconWrench,
  IconArrowLeft,
  IconSave,
  IconX,
  IconUsers,
  IconUserCheck,
  IconGradientDefs
} from '@/components/icons'

// Types
interface Technician {
  id: number
  nome: string
  tipo: 'interno' | 'externo'
  empresa: string
  telefone: string
  email: string
  especialidade: string
  notas: string
  ativo: number
  created_at: string
  updated_at: string
  intervention_count?: number
}

interface TechnicianStats {
  total: number
  internos: number
  externos: number
  ativos: number
  top_technicians: Array<{
    id: number
    nome: string
    tipo: string
    total: number
  }>
}

// Main component with routing
export default function TechniciansModule() {
  return (
    <Routes>
      <Route index element={<TechniciansList />} />
      <Route path="new" element={<TechnicianForm />} />
      <Route path=":id" element={<TechnicianDetail />} />
      <Route path=":id/edit" element={<TechnicianForm />} />
    </Routes>
  )
}

// List Component
function TechniciansList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const api = useApi()

  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [stats, setStats] = useState<TechnicianStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    tipo: '',
    ativo: '',
    search: ''
  })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; technician: Technician | null }>({
    open: false,
    technician: null
  })

  const loadTechnicians = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.tipo) params.append('tipo', filters.tipo)
      if (filters.ativo) params.append('ativo', filters.ativo)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get(`/technicians?${params.toString()}`)
      setTechnicians(response.technicians || [])
    } catch (error) {
      console.error('Error loading technicians:', error)
    } finally {
      setLoading(false)
    }
  }, [api, filters])

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get('/technicians/stats')
      setStats(response)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [api])

  useEffect(() => {
    loadTechnicians()
    loadStats()
  }, [loadTechnicians, loadStats])

  const handleDelete = async () => {
    if (!deleteDialog.technician) return

    try {
      await api.delete(`/technicians/${deleteDialog.technician.id}`)
      setDeleteDialog({ open: false, technician: null })
      loadTechnicians()
      loadStats()
    } catch (error: any) {
      alert(error.message || t('technicians.deactivateError'))
    }
  }

  const columns = [
    {
      key: 'nome',
      label: t('technicians.name'),
      sortable: true,
      render: (tech: Technician) => (
        <div className="flex items-center gap-2">
          <IconUser className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{tech.nome}</span>
        </div>
      )
    },
    {
      key: 'tipo',
      label: t('common.type'),
      sortable: true,
      render: (tech: Technician) => (
        <StatusBadge
          status={tech.tipo}
          colorMap={{ interno: 'blue', externo: 'purple' }}
        />
      )
    },
    {
      key: 'empresa',
      label: t('technicians.company'),
      sortable: true,
      render: (tech: Technician) => tech.empresa || '-'
    },
    {
      key: 'especialidade',
      label: t('technicians.specialization'),
      sortable: true,
      render: (tech: Technician) => tech.especialidade || '-'
    },
    {
      key: 'telefone',
      label: t('technicians.phone'),
      render: (tech: Technician) => (
        <div className="text-sm">
          {tech.telefone && (
            <div className="flex items-center gap-1">
              <IconPhone className="w-3 h-3" />
              {tech.telefone}
            </div>
          )}
          {tech.email && (
            <div className="flex items-center gap-1 text-gray-500">
              <IconMail className="w-3 h-3" />
              {tech.email}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'ativo',
      label: t('common.status'),
      render: (tech: Technician) => (
        <StatusBadge
          status={tech.ativo ? 'ativo' : 'inativo'}
          colorMap={{ ativo: 'green', inativo: 'gray' }}
        />
      )
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (tech: Technician) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/technicians/${tech.id}/edit`) }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Editar"
          >
            <IconEdit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, technician: tech }) }}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="Desativar"
            disabled={!tech.ativo}
          >
            <IconTrash className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('technicians.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('technicians.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/technicians/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <IconPlus className="w-4 h-4" />
          {t('technicians.newTechnician')}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <IconUsers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.total')}</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <IconUserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('technicians.internal')}</p>
                <p className="text-xl font-bold">{stats.internos}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <IconBuilding className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('technicians.external')}</p>
                <p className="text-xl font-bold">{stats.externos}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
                <IconWrench className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.active')}</p>
                <p className="text-xl font-bold">{stats.ativos}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            name="search"
            label={t('common.search')}
            type="text"
            value={filters.search}
            onChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
            placeholder={t('technicians.searchPlaceholder')}
          />
          <FormField
            name="tipo"
            label={t('common.type')}
            type="select"
            value={filters.tipo}
            onChange={(value) => setFilters(prev => ({ ...prev, tipo: value }))}
            options={[
              { value: '', label: t('common.all') },
              { value: 'interno', label: t('technicians.internal') },
              { value: 'externo', label: t('technicians.external') }
            ]}
          />
          <FormField
            name="ativo"
            label={t('common.status')}
            type="select"
            value={filters.ativo}
            onChange={(value) => setFilters(prev => ({ ...prev, ativo: value }))}
            options={[
              { value: '', label: t('common.all') },
              { value: 'true', label: t('common.active') },
              { value: 'false', label: t('common.inactive') }
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={technicians}
        loading={loading}
        onRowClick={(tech) => navigate(`/technicians/${tech.id}`)}
        emptyMessage={t('technicians.noTechniciansFound')}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        title={t('technicians.deactivateTechnician')}
        message={t('technicians.confirmDeactivate', { name: deleteDialog.technician?.nome })}
        confirmLabel={t('technicians.deactivate')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, technician: null })}
      />
    </div>
  )
}

// Form Component
function TechnicianForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const api = useApi()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'interno' as 'interno' | 'externo',
    empresa: '',
    telefone: '',
    email: '',
    especialidade: '',
    notas: '',
    ativo: true
  })

  useEffect(() => {
    if (isEdit) {
      loadTechnician()
    }
  }, [id])

  const loadTechnician = async () => {
    setLoading(true)
    try {
      const data = await api.get(`/technicians/${id}`)
      setFormData({
        nome: data.nome || '',
        tipo: data.tipo || 'interno',
        empresa: data.empresa || '',
        telefone: data.telefone || '',
        email: data.email || '',
        especialidade: data.especialidade || '',
        notas: data.notas || '',
        ativo: Boolean(data.ativo)
      })
    } catch (error) {
      console.error('Error loading technician:', error)
      navigate('/technicians')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      alert(t('technicians.nameRequired'))
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/technicians/${id}`, formData)
      } else {
        await api.post('/technicians', formData)
      }
      navigate('/technicians')
    } catch (error: any) {
      alert(error.message || t('technicians.saveError'))
    } finally {
      setSaving(false)
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
          onClick={() => navigate('/technicians')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <IconArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEdit ? t('technicians.editTechnician') : t('technicians.newTechnician')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isEdit ? t('technicians.editSubtitle') : t('technicians.newSubtitle')}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            name="nome"
            label={t('technicians.name')}
            type="text"
            value={formData.nome}
            onChange={(value) => setFormData(prev => ({ ...prev, nome: value }))}
            required
            placeholder={t('technicians.namePlaceholder')}
          />

          <FormField
            name="tipo"
            label={t('common.type')}
            type="select"
            value={formData.tipo}
            onChange={(value) => setFormData(prev => ({ ...prev, tipo: value as 'interno' | 'externo' }))}
            required
            options={[
              { value: 'interno', label: t('technicians.internal') },
              { value: 'externo', label: t('technicians.external') }
            ]}
          />

          <FormField
            name="empresa"
            label={t('technicians.company')}
            type="text"
            value={formData.empresa}
            onChange={(value) => setFormData(prev => ({ ...prev, empresa: value }))}
            placeholder={t('technicians.companyPlaceholder')}
          />

          <FormField
            name="especialidade"
            label={t('technicians.specialization')}
            type="text"
            value={formData.especialidade}
            onChange={(value) => setFormData(prev => ({ ...prev, especialidade: value }))}
            placeholder={t('technicians.specializationPlaceholder')}
          />

          <FormField
            name="telefone"
            label={t('technicians.phone')}
            type="text"
            value={formData.telefone}
            onChange={(value) => setFormData(prev => ({ ...prev, telefone: value }))}
            placeholder={t('technicians.phonePlaceholder')}
          />

          <FormField
            name="email"
            label={t('technicians.email')}
            type="text"
            value={formData.email}
            onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
            placeholder={t('technicians.emailPlaceholder')}
          />

          <div className="md:col-span-2">
            <FormField
              name="notas"
              label={t('technicians.notes')}
              type="textarea"
              value={formData.notas}
              onChange={(value) => setFormData(prev => ({ ...prev, notas: value }))}
              placeholder={t('technicians.notesPlaceholder')}
            />
          </div>

          {isEdit && (
            <FormField
              name="ativo"
              label={t('common.status')}
              type="checkbox"
              value={formData.ativo}
              onChange={(value) => setFormData(prev => ({ ...prev, ativo: value }))}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate('/technicians')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <IconX className="w-4 h-4" />
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <IconSave className="w-4 h-4" />
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  )
}

// Detail Component
function TechnicianDetail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const api = useApi()

  const [technician, setTechnician] = useState<Technician | null>(null)
  const [interventions, setInterventions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [techData, intData] = await Promise.all([
        api.get(`/technicians/${id}`),
        api.get(`/technicians/${id}/interventions`)
      ])
      setTechnician(techData)
      setInterventions(intData.interventions || [])
    } catch (error) {
      console.error('Error loading technician:', error)
      navigate('/technicians')
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

  if (!technician) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/technicians')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <IconArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {technician.nome}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge
                status={technician.tipo}
                colorMap={{ interno: 'blue', externo: 'purple' }}
              />
              <StatusBadge
                status={technician.ativo ? 'ativo' : 'inativo'}
                colorMap={{ ativo: 'green', inativo: 'gray' }}
              />
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/technicians/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <IconEdit className="w-4 h-4" />
          {t('common.edit')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Card */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">{t('technicians.information')}</h2>
          <dl className="space-y-4">
            {technician.empresa && (
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <IconBuilding className="w-4 h-4" />
                  {t('technicians.company')}
                </dt>
                <dd className="font-medium">{technician.empresa}</dd>
              </div>
            )}
            {technician.especialidade && (
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <IconWrench className="w-4 h-4" />
                  {t('technicians.specialization')}
                </dt>
                <dd className="font-medium">{technician.especialidade}</dd>
              </div>
            )}
            {technician.telefone && (
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <IconPhone className="w-4 h-4" />
                  {t('technicians.phone')}
                </dt>
                <dd className="font-medium">{technician.telefone}</dd>
              </div>
            )}
            {technician.email && (
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <IconMail className="w-4 h-4" />
                  {t('technicians.email')}
                </dt>
                <dd className="font-medium">{technician.email}</dd>
              </div>
            )}
            {technician.notas && (
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">{t('technicians.notes')}</dt>
                <dd className="text-sm">{technician.notas}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">{t('technicians.totalInterventions')}</dt>
              <dd className="font-medium">{technician.intervention_count || 0}</dd>
            </div>
          </dl>
        </div>

        {/* Interventions */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">{t('technicians.recentInterventions')}</h2>
          {interventions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">{t('technicians.noInterventions')}</p>
          ) : (
            <div className="space-y-3">
              {interventions.slice(0, 10).map((int) => (
                <div
                  key={int.id}
                  onClick={() => navigate(`/interventions/${int.id}`)}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <div>
                    <p className="font-medium">{int.numero}</p>
                    <p className="text-sm text-gray-500">{int.asset_serial}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge
                      status={int.estado}
                      colorMap={{
                        em_curso: 'yellow',
                        concluida: 'green',
                        cancelada: 'red'
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(int.created_at).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
