import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2 } from 'lucide-react'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout'
import DataTable from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Multa, Veiculo, PaginatedResponse, PaginationParams } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const Multas: React.FC = () => {
  const queryClient = useQueryClient()
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFine, setEditingFine] = useState<Multa | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false })
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [formData, setFormData] = useState({
    veiculo_id: '',
    numero_infracao: '',
    data_infracao: '',
    valor: 0,
    data_vencimento: '',
    data_pagamento: '',
    status: 'pendente' as 'pendente' | 'pago' | 'vencido',
    descricao: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['multas', pagination, statusFilter],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Multa>>('/multas', {
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
    mutationFn: (data: any) => api.post('/multas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multas'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Multa criada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar multa')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/multas/${editingFine?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multas'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Multa atualizada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar multa')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/multas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multas'] })
      setDeleteConfirm({ isOpen: false })
      toast.success('Multa deletada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar multa')
    },
  })

  const resetForm = () => {
    setFormData({
      veiculo_id: '',
      numero_infracao: '',
      data_infracao: '',
      valor: 0,
      data_vencimento: '',
      data_pagamento: '',
      status: 'pendente',
      descricao: '',
    })
    setEditingFine(null)
  }

  const handleOpenModal = (fine?: Multa) => {
    if (fine) {
      setEditingFine(fine)
      setFormData(fine)
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.veiculo_id || !formData.numero_infracao || formData.valor <= 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (editingFine) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const columns = [
    { key: 'numero_infracao' as const, label: 'Infração', sortable: true, width: '15%' },
    { key: 'veiculo_id' as const, label: 'Veículo', render: (_: any, row: any) => row.veiculo?.placa || '-' },
    { key: 'data_infracao' as const, label: 'Data Infração', render: (date: string) => formatDate(date) },
    { key: 'valor' as const, label: 'Valor', render: (value: number) => formatCurrency(value) },
    { key: 'data_vencimento' as const, label: 'Vencimento', render: (date: string) => formatDate(date) },
    { key: 'status' as const, label: 'Status', render: (status: string) => <StatusBadge status={status} /> },
    {
      key: 'id' as const,
      label: 'Ações',
      render: (_: any, row: Multa) => (
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
            <h1 className="text-3xl font-display font-bold text-slate-900">Multas</h1>
            <p className="text-slate-600 mt-1">Gerenciamento de multas de trânsito</p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Nova Multa
          </button>
        </div>

        <div className="flex gap-2">
          {['todos', 'pendente', 'pago', 'vencido'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status)
                setPagination({ ...pagination, page: 1 })
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status === 'todos' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
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
              {editingFine ? 'Editar Multa' : 'Nova Multa'}
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
                      {v.placa}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Número Infração *</label>
                <input
                  type="text"
                  value={formData.numero_infracao}
                  onChange={(e) => setFormData({ ...formData, numero_infracao: e.target.value })}
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Data Infração</label>
                  <input
                    type="date"
                    value={formData.data_infracao}
                    onChange={(e) => setFormData({ ...formData, data_infracao: e.target.value })}
                    className="input-field"
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Data Vencimento</label>
                  <input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Data Pagamento</label>
                  <input
                    type="date"
                    value={formData.data_pagamento}
                    onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
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
                  <option value="pago">Pago</option>
                  <option value="vencido">Vencido</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
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
                  {editingFine ? 'Atualizar' : 'Criar'} Multa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar Multa"
        message="Tem certeza que deseja deletar esta multa? Esta ação não pode ser desfeita."
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

export default Multas
