import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout'
import DataTable from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Contrato, Cliente, Veiculo, PaginatedResponse, PaginationParams } from '@/types'
import { formatCurrency, formatDate, calculateDays } from '@/lib/utils'
import toast from 'react-hot-toast'

const Contratos: React.FC = () => {
  const queryClient = useQueryClient()
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 })
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<Contrato | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false })
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  const [formData, setFormData] = useState({
    cliente_id: '',
    veiculo_id: '',
    data_inicio: '',
    data_fim: '',
    quilometragem_inicial: 0,
    valor_diaria: 0,
    observacoes: '',
  })

  const { data: contratos, isLoading } = useQuery({
    queryKey: ['contratos', pagination, statusFilter],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<any>>('/contratos', {
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
    mutationFn: (data: any) => api.post('/contratos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Contrato criado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar contrato')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/contratos/${editingContract?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Contrato atualizado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar contrato')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contratos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      setDeleteConfirm({ isOpen: false })
      toast.success('Contrato deletado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar contrato')
    },
  })

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      veiculo_id: '',
      data_inicio: '',
      data_fim: '',
      quilometragem_inicial: 0,
      valor_diaria: 0,
      observacoes: '',
    })
    setEditingContract(null)
    setStep(1)
  }

  const handleOpenModal = (contract?: Contrato) => {
    if (contract) {
      setEditingContract(contract)
      setFormData(contract)
      setStep(3)
    } else {
      resetForm()
      setStep(1)
    }
    setIsModalOpen(true)
  }

  const handleNextStep = () => {
    if (step === 1 && formData.cliente_id && formData.veiculo_id) {
      setStep(2)
    } else if (step === 2 && formData.data_inicio && formData.data_fim && formData.valor_diaria > 0) {
      setStep(3)
    }
  }

  const handlePrevStep = () => {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.cliente_id ||
      !formData.veiculo_id ||
      !formData.data_inicio ||
      !formData.data_fim ||
      formData.valor_diaria <= 0
    ) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    const dias = calculateDays(formData.data_inicio, formData.data_fim)
    const payload = {
      ...formData,
      valor_total: dias * formData.valor_diaria,
    }

    if (editingContract) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const dias = formData.data_inicio && formData.data_fim ? calculateDays(formData.data_inicio, formData.data_fim) : 0
  const valor_total = dias * formData.valor_diaria

  const columns = [
    {
      key: 'numero' as const,
      label: 'Número',
      sortable: true,
      width: '15%',
    },
    {
      key: 'cliente_id' as const,
      label: 'Cliente',
      render: (_: any, row: any) => row.cliente?.nome || '-',
    },
    {
      key: 'veiculo_id' as const,
      label: 'Veículo',
      render: (_: any, row: any) => `${row.veiculo?.marca} ${row.veiculo?.modelo}`,
    },
    {
      key: 'data_inicio' as const,
      label: 'Data Início',
      render: (date: string) => formatDate(date),
    },
    {
      key: 'data_fim' as const,
      label: 'Data Fim',
      render: (date: string) => formatDate(date),
    },
    {
      key: 'valor_total' as const,
      label: 'Valor',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      key: 'id' as const,
      label: 'Ações',
      render: (_: any, row: Contrato) => (
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
            <h1 className="text-3xl font-display font-bold text-slate-900">Contratos</h1>
            <p className="text-slate-600 mt-1">Gerenciamento de contratos de aluguel</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Novo Contrato
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          {['todos', 'ativo', 'finalizado', 'cancelado', 'atraso'].map((status) => (
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
              {status === 'todos' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="card">
          <DataTable
            columns={columns}
            data={contratos?.data || []}
            isLoading={isLoading}
            pagination={{
              page: pagination.page,
              limit: pagination.limit,
              total: contratos?.total || 0,
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
              {editingContract ? 'Editar Contrato' : 'Novo Contrato'}
            </h2>

            {/* Step Indicator */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-2 rounded-full ${
                    s <= step ? 'bg-primary' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 1: Cliente e Veículo */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Cliente *
                    </label>
                    <select
                      value={formData.cliente_id}
                      onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                      className="input-field"
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Veículo *
                    </label>
                    <select
                      value={formData.veiculo_id}
                      onChange={(e) => setFormData({ ...formData, veiculo_id: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Selecione um veículo</option>
                      {veiculos?.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.placa} - {v.marca} {v.modelo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 2: Datas e Valor */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Data Início *
                      </label>
                      <input
                        type="date"
                        value={formData.data_inicio}
                        onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Data Fim *
                      </label>
                      <input
                        type="date"
                        value={formData.data_fim}
                        onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quilometragem Inicial
                    </label>
                    <input
                      type="number"
                      value={formData.quilometragem_inicial}
                      onChange={(e) => setFormData({ ...formData, quilometragem_inicial: parseInt(e.target.value) })}
                      min="0"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Valor Diária *
                    </label>
                    <input
                      type="number"
                      value={formData.valor_diaria}
                      onChange={(e) => setFormData({ ...formData, valor_diaria: parseFloat(e.target.value) })}
                      step="0.01"
                      min="0"
                      className="input-field"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {step === 3 && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-600">Cliente</p>
                    <p className="font-semibold text-slate-900">
                      {clientes?.find((c) => c.id === formData.cliente_id)?.nome}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600">Veículo</p>
                    <p className="font-semibold text-slate-900">
                      {veiculos?.find((v) => v.id === formData.veiculo_id)?.placa}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Data Início</p>
                      <p className="font-semibold text-slate-900">{formatDate(formData.data_inicio)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Data Fim</p>
                      <p className="font-semibold text-slate-900">{formatDate(formData.data_fim)}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-600">Dias</p>
                      <p className="font-semibold">{dias}</p>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-600">Valor/Dia</p>
                      <p className="font-semibold">{formatCurrency(formData.valor_diaria)}</p>
                    </div>
                    <div className="flex items-center justify-between bg-primary/10 p-3 rounded-lg">
                      <p className="font-medium text-primary flex items-center gap-2">
                        <DollarSign size={18} />
                        Valor Total
                      </p>
                      <p className="font-bold text-primary text-lg">{formatCurrency(valor_total)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Observações
                    </label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      className="input-field"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 justify-between pt-4 border-t border-slate-200">
                <div className="flex gap-2">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="btn-secondary"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      Voltar
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Cancelar
                  </button>

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="btn-primary"
                    >
                      Próximo
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingContract ? 'Atualizar' : 'Criar'} Contrato
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar Contrato"
        message="Tem certeza que deseja deletar este contrato? Esta ação não pode ser desfeita."
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

export default Contratos
