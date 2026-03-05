import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2 } from 'lucide-react'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import StatusBadge from '@/components/shared/StatusBadge'
import { Seguro, Veiculo, PaginatedResponse, PaginationParams } from '@/types'
import { formatCurrency, formatDate, isExpiringSoon, isExpired } from '@/lib/utils'
import toast from 'react-hot-toast'

const Seguros: React.FC = () => {
  const queryClient = useQueryClient()
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInsurance, setEditingInsurance] = useState<Seguro | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false })
  const [formData, setFormData] = useState({
    veiculo_id: '',
    seguradora: '',
    numero_apolice: '',
    data_inicio: '',
    data_fim: '',
    valor_mensal: 0,
    cobertura: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['seguros', pagination],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<any>>('/seguros', {
        params: { page: pagination.page, limit: pagination.limit },
      })
      return data
    },
  })

  const { data: veiculos } = useQuery({
    queryKey: ['veiculos-select'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Veiculo>>('/veiculos', { params: { limit: 1000 } })
      return data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/seguros', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguros'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Seguro criado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar seguro')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/seguros/${editingInsurance?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguros'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Seguro atualizado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar seguro')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/seguros/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguros'] })
      setDeleteConfirm({ isOpen: false })
      toast.success('Seguro deletado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar seguro')
    },
  })

  const resetForm = () => {
    setFormData({
      veiculo_id: '',
      seguradora: '',
      numero_apolice: '',
      data_inicio: '',
      data_fim: '',
      valor_mensal: 0,
      cobertura: '',
    })
    setEditingInsurance(null)
  }

  const handleOpenModal = (insurance?: Seguro) => {
    if (insurance) {
      setEditingInsurance(insurance)
      setFormData(insurance)
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.veiculo_id || !formData.seguradora || !formData.numero_apolice) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (editingInsurance) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const columns = [
    { key: 'numero_apolice' as const, label: 'Apólice', sortable: true, width: '15%' },
    { key: 'veiculo_id' as const, label: 'Veículo', render: (_: any, row: any) => row.veiculo?.placa || '-' },
    { key: 'seguradora' as const, label: 'Seguradora', sortable: true },
    { key: 'valor_mensal' as const, label: 'Valor/Mês', render: (value: number) => formatCurrency(value) },
    {
      key: 'data_fim' as const,
      label: 'Vencimento',
      render: (date: string) => (
        <div className="flex items-center gap-2">
          <span>{formatDate(date)}</span>
          {isExpired(date) && <StatusBadge status="vencido" size="sm" />}
          {isExpiringSoon(date) && !isExpired(date) && <StatusBadge status="atencao" size="sm" />}
        </div>
      ),
    },
    {
      key: 'id' as const,
      label: 'Ações',
      render: (_: any, row: Seguro) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenModal(row)} className="p-2 text-slate-600 hover:text-primary">
            <Edit size={16} />
          </button>
          <button onClick={() => setDeleteConfirm({ isOpen: true, id: row.id })} className="p-2 text-slate-600 hover:text-danger">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Seguros</h1>
            <p className="text-slate-600 mt-1">Gerenciamento de seguros dos veículos</p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Novo Seguro
          </button>
        </div>

        <div className="card">
          <DataTable
            columns={columns}
            data={data?.data || []}
            isLoading={isLoading}
            pagination={{
              page: pagination.page,
              limit: pagination.limit,
              total: data?.total || 0,
              onPageChange: (page) => setPagination({ ...pagination, page }),
            }}
          />
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">
              {editingInsurance ? 'Editar Seguro' : 'Novo Seguro'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Veículo *</label>
                <select
                  value={formData.veiculo_id}
                  onChange={(e) => setFormData({ ...formData, veiculo_id: e.target.value })}
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <option value="">Selecione um veículo</option>
                  {veiculos?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} - {v.marca} {v.modelo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Seguradora *</label>
                <input
                  type="text"
                  value={formData.seguradora}
                  onChange={(e) => setFormData({ ...formData, seguradora: e.target.value })}
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Número Apólice *</label>
                <input
                  type="text"
                  value={formData.numero_apolice}
                  onChange={(e) => setFormData({ ...formData, numero_apolice: e.target.value })}
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Data Início</label>
                  <input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Data Fim</label>
                  <input
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Valor Mensal</label>
                <input
                  type="number"
                  value={formData.valor_mensal}
                  onChange={(e) => setFormData({ ...formData, valor_mensal: parseFloat(e.target.value) })}
                  step="0.01"
                  min="0"
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cobertura</label>
                <textarea
                  value={formData.cobertura}
                  onChange={(e) => setFormData({ ...formData, cobertura: e.target.value })}
                  className="input-field"
                  rows={3}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" disabled={createMutation.isPending || updateMutation.isPending}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingInsurance ? 'Atualizar' : 'Criar'} Seguro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar Seguro"
        message="Tem certeza que deseja deletar este seguro? Esta ação não pode ser desfeita."
        confirmText="Deletar"
        cancelText="Cancelar"
        isDanger={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteConfirm.id && deleteMutation.mutate(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ isOpen: false })}
      />
    </AppLayout>
  )
}

export default Seguros
