import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2 } from 'lucide-react'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout'
import DataTable from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Veiculo, PaginatedResponse, PaginationParams } from '@/types'
import { formatCurrency, formatDate, formatPlaca } from '@/lib/utils'
import toast from 'react-hot-toast'

const Veiculos: React.FC = () => {
  const queryClient = useQueryClient()
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Veiculo | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false })
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [formData, setFormData] = useState({
    placa: '',
    marca: '',
    modelo: '',
    ano: new Date().getFullYear(),
    cor: '',
    quilometragem: 0,
    status: 'disponivel' as const,
    valor_aquisicao: 0,
    data_compra: '',
    observacoes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['veiculos', pagination, statusFilter],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Veiculo>>('/veiculos', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter !== 'todos' ? statusFilter : undefined,
        },
      })
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/veiculos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Veículo criado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar veículo')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/veiculos/${editingVehicle?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Veículo atualizado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar veículo')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/veiculos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] })
      setDeleteConfirm({ isOpen: false })
      toast.success('Veículo deletado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar veículo')
    },
  })

  const resetForm = () => {
    setFormData({
      placa: '',
      marca: '',
      modelo: '',
      ano: new Date().getFullYear(),
      cor: '',
      quilometragem: 0,
      status: 'disponivel',
      valor_aquisicao: 0,
      data_compra: '',
      observacoes: '',
    })
    setEditingVehicle(null)
  }

  const handleOpenModal = (vehicle?: Veiculo) => {
    if (vehicle) {
      setEditingVehicle(vehicle)
      setFormData(vehicle)
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.placa || !formData.marca || !formData.modelo) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (editingVehicle) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const columns = [
    {
      key: 'placa' as const,
      label: 'Placa',
      sortable: true,
      width: '15%',
      render: (placa: string) => <span className="font-semibold">{formatPlaca(placa)}</span>,
    },
    {
      key: 'marca' as const,
      label: 'Marca',
      sortable: true,
      width: '15%',
    },
    {
      key: 'modelo' as const,
      label: 'Modelo',
      sortable: true,
      width: '20%',
    },
    {
      key: 'ano' as const,
      label: 'Ano',
      sortable: true,
      width: '10%',
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      key: 'quilometragem' as const,
      label: 'Km',
      render: (km: number) => `${km.toLocaleString('pt-BR')} km`,
    },
    {
      key: 'id' as const,
      label: 'Ações',
      render: (_: any, row: Veiculo) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenModal(row)}
            className="p-2 text-slate-600 hover:text-primary transition-colors"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteConfirm({ isOpen: true, id: row.id })}
            className="p-2 text-slate-600 hover:text-danger transition-colors"
          >
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
            <h1 className="text-3xl font-display font-bold text-slate-900">Veículos</h1>
            <p className="text-slate-600 mt-1">Gerenciamento da frota</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Novo Veículo
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          {['todos', 'disponivel', 'alugado', 'manutencao', 'inativo'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status)
                setPagination({ ...pagination, page: 1 })
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6">
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">
              {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Placa *
                  </label>
                  <input
                    type="text"
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                    placeholder="ABC1234"
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Marca *
                  </label>
                  <input
                    type="text"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ano *
                  </label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cor
                  </label>
                  <input
                    type="text"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quilometragem
                  </label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Valor Aquisição
                  </label>
                  <input
                    type="number"
                    value={formData.valor_aquisicao}
                    onChange={(e) => setFormData({ ...formData, valor_aquisicao: parseFloat(e.target.value) })}
                    step="0.01"
                    min="0"
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Data Compra
                  </label>
                  <input
                    type="date"
                    value={formData.data_compra}
                    onChange={(e) => setFormData({ ...formData, data_compra: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="alugado">Alugado</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="input-field"
                    rows={3}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingVehicle ? 'Atualizar' : 'Criar'} Veículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar Veículo"
        message="Tem certeza que deseja deletar este veículo? Esta ação não pode ser desfeita."
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

export default Veiculos
