import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Financeiro, PaginatedResponse, PaginationParams } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const FinanceiroPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Financeiro | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false })
  const [typeFilter, setTypeFilter] = useState<string>('todos')
  const [formData, setFormData] = useState({
    tipo: 'receita' as 'receita' | 'despesa',
    categoria: '',
    descricao: '',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    status: 'pendente' as 'pendente' | 'pago' | 'cancelado',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['financeiro', pagination, typeFilter],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Financeiro>>('/financeiro', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          tipo: typeFilter !== 'todos' ? typeFilter : undefined,
        },
      })
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/financeiro', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Registro criado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar registro')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/financeiro/${editingRecord?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Registro atualizado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar registro')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/financeiro/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
      setDeleteConfirm({ isOpen: false })
      toast.success('Registro deletado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar registro')
    },
  })

  const resetForm = () => {
    setFormData({
      tipo: 'receita',
      categoria: '',
      descricao: '',
      valor: 0,
      data: new Date().toISOString().split('T')[0],
      status: 'pendente',
    })
    setEditingRecord(null)
  }

  const handleOpenModal = (record?: Financeiro) => {
    if (record) {
      setEditingRecord(record)
      setFormData(record)
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.categoria || !formData.descricao || formData.valor <= 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (editingRecord) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const totalReceita = data?.data.filter((r) => r.tipo === 'receita').reduce((sum, r) => sum + r.valor, 0) || 0
  const totalDespesa = data?.data.filter((r) => r.tipo === 'despesa').reduce((sum, r) => sum + r.valor, 0) || 0
  const saldo = totalReceita - totalDespesa

  const columns = [
    { key: 'data' as const, label: 'Data', sortable: true, render: (date: string) => formatDate(date) },
    { key: 'tipo' as const, label: 'Tipo', render: (tipo: string) => <span className="badge badge-info">{tipo === 'receita' ? 'Receita' : 'Despesa'}</span> },
    { key: 'categoria' as const, label: 'Categoria', sortable: true },
    { key: 'descricao' as const, label: 'Descrição' },
    {
      key: 'valor' as const,
      label: 'Valor',
      render: (valor: number, row: Financeiro) => (
        <span className={row.tipo === 'receita' ? 'text-success font-semibold' : 'text-danger font-semibold'}>
          {row.tipo === 'receita' ? '+' : '-'} {formatCurrency(valor)}
        </span>
      ),
    },
    { key: 'status' as const, label: 'Status' },
    {
      key: 'id' as const,
      label: 'Ações',
      render: (_: any, row: Financeiro) => (
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
            <h1 className="text-3xl font-display font-bold text-slate-900">Financeiro</h1>
            <p className="text-slate-600 mt-1">Gerenciamento financeiro</p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Novo Registro
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Receita</p>
                <p className="text-2xl font-display font-bold text-success mt-2">{formatCurrency(totalReceita)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="text-success" size={24} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Despesa</p>
                <p className="text-2xl font-display font-bold text-danger mt-2">{formatCurrency(totalDespesa)}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <TrendingDown className="text-danger" size={24} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Saldo</p>
                <p className={`text-2xl font-display font-bold mt-2 ${saldo >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(saldo)}</p>
              </div>
              <div className={`p-3 rounded-lg ${saldo >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {saldo >= 0 ? <TrendingUp className="text-success" size={24} /> : <TrendingDown className="text-danger" size={24} />}
              </div>
            </div>
          </div>
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          {['todos', 'receita', 'despesa'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setTypeFilter(type)
                setPagination({ ...pagination, page: 1 })
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === type ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {type === 'todos' ? 'Todos' : type === 'receita' ? 'Receitas' : 'Despesas'}
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
              {editingRecord ? 'Editar Registro' : 'Novo Registro'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                  className="input-field"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Categoria *</label>
                <input
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Data</label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
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
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" disabled={createMutation.isPending || updateMutation.isPending}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingRecord ? 'Atualizar' : 'Criar'} Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar Registro"
        message="Tem certeza que deseja deletar este registro? Esta ação não pode ser desfeita."
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

export default FinanceiroPage
