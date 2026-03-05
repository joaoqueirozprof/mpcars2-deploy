import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2 } from 'lucide-react'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout'
import DataTable from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Reserva, Cliente, Veiculo, PaginatedResponse, PaginationParams } from '@/types'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const Reservas: React.FC = () => {
  const queryClient = useQueryClient()
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reserva | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false })
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [formData, setFormData] = useState({
    cliente_id: '',
    veiculo_id: '',
    data_inicio: '',
    data_fim: '',
    status: 'ativa' as 'ativa' | 'cancelada' | 'convertida',
    observacoes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['reservas', pagination, statusFilter],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<any>>('/reservas', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter !== 'todos' ? statusFilter : undefined,
        },
      })
      return data
    },
  })

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Cliente>>('/clientes', { params: { limit: 1000 } })
      return data.data
    },
  })

  const { data: veiculos } = useQuery({
    queryKey: ['veiculos-select'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Veiculo>>('/veiculos', { params: { limit: 1000 } })
      return data.data.filter((v) => v.status === 'disponivel')
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/reservas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Reserva criada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar reserva')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/reservas/${editingReservation?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Reserva atualizada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar reserva')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/reservas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] })
      setDeleteConfirm({ isOpen: false })
      toast.success('Reserva deletada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar reserva')
    },
  })

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      veiculo_id: '',
      data_inicio: '',
      data_fim: '',
      status: 'ativa',
      observacoes: '',
    })
    setEditingReservation(null)
  }

  const handleOpenModal = (reservation?: Reserva) => {
    if (reservation) {
      setEditingReservation(reservation)
      setFormData(reservation)
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.cliente_id || !formData.veiculo_id || !formData.data_inicio || !formData.data_fim) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (editingReservation) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const columns = [
    { key: 'cliente_id' as const, label: 'Cliente', render: (_: any, row: any) => row.cliente?.nome || '-' },
    { key: 'veiculo_id' as const, label: 'Veículo', render: (_: any, row: any) => row.veiculo?.placa || '-' },
    { key: 'data_inicio' as const, label: 'Início', render: (date: string) => formatDate(date) },
    { key: 'data_fim' as const, label: 'Fim', render: (date: string) => formatDate(date) },
    { key: 'status' as const, label: 'Status', render: (status: string) => <StatusBadge status={status} /> },
    {
      key: 'id' as const,
      label: 'Ações',
      render: (_: any, row: Reserva) => (
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
            <h1 className="text-3xl font-display font-bold text-slate-900">Reservas</h1>
            <p className="text-slate-600 mt-1">Gerenciamento de reservas de veículos</p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Nova Reserva
          </button>
        </div>

        <div className="flex gap-2">
          {['todos', 'ativa', 'cancelada', 'convertida'].map((status) => (
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
              {editingReservation ? 'Editar Reserva' : 'Nova Reserva'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cliente *</label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <option value="">Selecione um cliente</option>
                  {clientes?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Data Início *</label>
                  <input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Data Fim *</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <option value="ativa">Ativa</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="convertida">Convertida</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
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
                  {editingReservation ? 'Atualizar' : 'Criar'} Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar Reserva"
        message="Tem certeza que deseja deletar esta reserva? Esta ação não pode ser desfeita."
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

export default Reservas
