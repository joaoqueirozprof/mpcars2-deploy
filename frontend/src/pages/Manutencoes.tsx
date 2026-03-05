import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2 } from 'lucide-react'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout'
import DataTable from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Manutencao, Veiculo, PaginatedResponse, PaginationParams } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const Manutencoes: React.FC = () => {
  const queryClient = useQueryClient()
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMaintenance, setEditingMaintenance] = useState<Manutencao | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false })
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [formData, setFormData] = useState({
    veiculo_id: '',
    data_manutencao: new Date().toISOString().split('T')[0],
    tipo: 'preventiva' as 'preventiva' | 'corretiva',
    descricao: '',
    valor: 0,
    oficina: '',
    quilometragem: 0,
    status: 'pendente' as 'pendente' | 'em_progresso' | 'concluida' | 'cancelada',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['manutencoes', pagination, statusFilter],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<any>>('/manutencoes', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter !== 'todos' ? statusFilter : undefined,
        },
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
    mutationFn: (data: any) => api.post('/manutencoes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manutencoes'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Manutenção criada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar manutenção')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/manutencoes/${editingMaintenance?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manutencoes'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Manutenção atualizada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar manutenção')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/manutencoes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manutencoes'] })
      setDeleteConfirm({ isOpen: false })
      toast.success('Manutenção deletada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar manutenção')
    },
  })

  const resetForm = () => {
    setFormData({
      veiculo_id: '',
      data_manutencao: new Date().toISOString().split('T')[0],
      tipo: 'preventiva',
      descricao: '',
      valor: 0,
      oficina: '',
      quilometragem: 0,
      status: 'pendente',
    })
    setEditingMaintenance(null)
  }

  const handleOpenModal = (maintenance?: Manutencao) => {
    if (maintenance) {
      setEditingMaintenance(maintenance)
      setFormData(maintenance)
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.veiculo_id || !formData.descricao || formData.valor <= 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (editingMaintenance) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const columns = [
    { key: 'veiculo_id' as const, label: 'Veículo', render: (_: any, row: any) => row.veiculo?.placa || '-' },
    { key: 'tipo' as const, label: 'Tipo', render: (tipo: string) => <StatusBadge status={tipo} label={tipo === 'preventiva' ? 'Preventiva' : 'Corretiva'} /> },
    { key: 'data_manutencao' as const, label: 'Data', render: (date: string) => formatDate(date) },
    { key: 'oficina' as const, label: 'Oficina' },
    { key: 'valor' as const, label: 'Valor', render: (value: number) => formatCurrency(value) },
    { key: 'status' as const, label: 'Status', render: (status: string) => <StatusBadge status={status} /> },
    {
      key: 'id' as const,
      label: 'Ações',
      render: (_: any, row: Manutencao) => (
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
            <h1 className="text-3xl font-display font-bold text-slate-900">Manutenções</h1>
            <p className="text-slate-600 mt-1">Gerenciamento de manutenção da frota</p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Nova Manutenção
          </button>
        </div>

        <div className="flex gap-2">
          {['todos', 'pendente', 'em_progresso', 'concluida', 'cancelada'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status)
                setPagination({ ...pagination, page: 1 })
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                statusFilter === status ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status === 'todos' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
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
              {editingMaintenance ? 'Editar Manutenção' : 'Nova Manutenção'}
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <option value="preventiva">Preventiva</option>
                  <option value="corretiva">Corretiva</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Data Manutenção</label>
                <input
                  type="date"
                  value={formData.data_manutencao}
                  onChange={(e) => setFormData({ ...formData, data_manutencao: e.target.value })}
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Descrição *</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="input-field"
                  rows={3}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Valor *</label>
                <input
                  type="number"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
                  step="0.01"
                  min="0"
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Oficina</label>
                <input
                  type="text"
                  value={formData.oficina}
                  onChange={(e) => setFormData({ ...formData, oficina: e.target.value })}
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quilometragem</label>
                <input
                  type="number"
                  value={formData.quilometragem}
                  onChange={(e) => setFormData({ ...formData, quilometragem: parseInt(e.target.value) })}
                  min="0"
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_progresso">Em Progresso</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" disabled={createMutation.isPending || updateMutation.isPending}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingMaintenance ? 'Atualizar' : 'Criar'} Manutenção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar Manutenção"
        message="Tem certeza que deseja deletar esta manutenção? Esta ação não pode ser desfeita."
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

export default Manutencoes
