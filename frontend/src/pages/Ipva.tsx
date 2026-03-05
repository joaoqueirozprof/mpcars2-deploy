import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2 } from 'lucide-react'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout'
import DataTable from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { IPVA, Veiculo, PaginatedResponse, PaginationParams } from '@/types'
import { formatCurrency, formatDate, isExpired } from '@/lib/utils'
import toast from 'react-hot-toast'

const Ipva: React.FC = () => {
  const queryClient = useQueryClient()
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIPVA, setEditingIPVA] = useState<IPVA | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false })
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [formData, setFormData] = useState({
    veiculo_id: '',
    ano: new Date().getFullYear(),
    valor: 0,
    data_vencimento: '',
    data_pagamento: '',
    status: 'pendente' as 'pendente' | 'pago' | 'vencido',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['ipva', pagination, statusFilter],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<any>>('/ipva', {
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
    mutationFn: (data: any) => api.post('/ipva', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipva'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('IPVA criado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar IPVA')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/ipva/${editingIPVA?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipva'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('IPVA atualizado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar IPVA')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ipva/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipva'] })
      setDeleteConfirm({ isOpen: false })
      toast.success('IPVA deletado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar IPVA')
    },
  })

  const resetForm = () => {
    setFormData({
      veiculo_id: '',
      ano: new Date().getFullYear(),
      valor: 0,
      data_vencimento: '',
      data_pagamento: '',
      status: 'pendente',
    })
    setEditingIPVA(null)
  }

  const handleOpenModal = (ipva?: IPVA) => {
    if (ipva) {
      setEditingIPVA(ipva)
      setFormData(ipva)
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.veiculo_id || formData.valor <= 0 || !formData.data_vencimento) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (editingIPVA) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const columns = [
    { key: 'ano' as const, label: 'Ano', sortable: true, width: '10%' },
    { key: 'veiculo_id' as const, label: 'Veículo', render: (_: any, row: any) => row.veiculo?.placa || '-' },
    { key: 'valor' as const, label: 'Valor', render: (value: number) => formatCurrency(value) },
    { key: 'data_vencimento' as const, label: 'Vencimento', render: (date: string) => formatDate(date) },
    { key: 'data_pagamento' as const, label: 'Pagamento', render: (date: string) => date ? formatDate(date) : '-' },
    { key: 'status' as const, label: 'Status', render: (status: string) => <StatusBadge status={status} /> },
    {
      key: 'id' as const,
      label: 'Ações',
      render: (_: any, row: IPVA) => (
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
            <h1 className="text-3xl font-display font-bold text-slate-900">IPVA</h1>
            <p className="text-slate-600 mt-1">Gerenciamento de IPVA dos veículos</p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Novo IPVA
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
              {editingIPVA ? 'Editar IPVA' : 'Novo IPVA'}
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Ano *</label>
                <input
                  type="number"
                  value={formData.ano}
                  onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                  min="1900"
                  max={new Date().getFullYear() + 1}
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Data Vencimento *</label>
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

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" disabled={createMutation.isPending || updateMutation.isPending}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingIPVA ? 'Atualizar' : 'Criar'} IPVA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar IPVA"
        message="Tem certeza que deseja deletar este IPVA? Esta ação não pode ser desfeita."
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

export default Ipva
