import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2 } from 'lucide-react'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Empresa, PaginatedResponse, PaginationParams } from '@/types'
import { formatPhone } from '@/lib/utils'
import toast from 'react-hot-toast'

const Empresas: React.FC = () => {
  const queryClient = useQueryClient()
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Empresa | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false })
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    responsavel: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['empresas', pagination],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Empresa>>('/empresas', {
        params: { page: pagination.page, limit: pagination.limit },
      })
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/empresas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Empresa criada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar empresa')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/empresas/${editingCompany?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Empresa atualizada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar empresa')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/empresas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      setDeleteConfirm({ isOpen: false })
      toast.success('Empresa deletada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar empresa')
    },
  })

  const resetForm = () => {
    setFormData({
      nome: '',
      cnpj: '',
      telefone: '',
      email: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      responsavel: '',
    })
    setEditingCompany(null)
  }

  const handleOpenModal = (company?: Empresa) => {
    if (company) {
      setEditingCompany(company)
      setFormData(company)
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome || !formData.cnpj) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (editingCompany) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const columns = [
    { key: 'nome' as const, label: 'Nome', sortable: true, width: '25%' },
    { key: 'cnpj' as const, label: 'CNPJ', width: '15%' },
    { key: 'telefone' as const, label: 'Telefone', render: (phone: string) => formatPhone(phone) },
    { key: 'email' as const, label: 'Email', width: '20%' },
    { key: 'cidade' as const, label: 'Cidade' },
    {
      key: 'id' as const,
      label: 'Ações',
      render: (_: any, row: Empresa) => (
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
            <h1 className="text-3xl font-display font-bold text-slate-900">Empresas</h1>
            <p className="text-slate-600 mt-1">Gerenciamento de empresas</p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Nova Empresa
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
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6">
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">
              {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nome *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">CNPJ *</label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Endereço</label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cidade</label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
                  <input
                    type="text"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    maxLength={2}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">CEP</label>
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Responsável</label>
                  <input
                    type="text"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" disabled={createMutation.isPending || updateMutation.isPending}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCompany ? 'Atualizar' : 'Criar'} Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar Empresa"
        message="Tem certeza que deseja deletar esta empresa? Esta ação não pode ser desfeita."
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

export default Empresas
