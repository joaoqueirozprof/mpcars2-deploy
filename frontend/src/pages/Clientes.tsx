import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Phone, Mail } from 'lucide-react'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Cliente, PaginatedResponse, PaginationParams } from '@/types'
import { formatDate, formatPhone, formatCPF, validateEmail } from '@/lib/utils'
import toast from 'react-hot-toast'

const Clientes: React.FC = () => {
  const queryClient = useQueryClient()
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Cliente | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false })
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf_cnpj: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    tipo: 'pessoa_fisica' as 'pessoa_fisica' | 'pessoa_juridica',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', pagination],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Cliente>>('/clientes', {
        params: { page: pagination.page, limit: pagination.limit },
      })
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/clientes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Cliente criado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar cliente')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/clientes/${editingClient?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      setIsModalOpen(false)
      resetForm()
      toast.success('Cliente atualizado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar cliente')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/clientes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      setDeleteConfirm({ isOpen: false })
      toast.success('Cliente deletado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar cliente')
    },
  })

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cpf_cnpj: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      tipo: 'pessoa_fisica',
    })
    setEditingClient(null)
  }

  const handleOpenModal = (client?: Cliente) => {
    if (client) {
      setEditingClient(client)
      setFormData(client)
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome || !formData.email || !formData.telefone) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (!validateEmail(formData.email)) {
      toast.error('Email inválido')
      return
    }

    if (editingClient) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const columns = [
    {
      key: 'nome' as const,
      label: 'Nome',
      sortable: true,
      width: '30%',
    },
    {
      key: 'email' as const,
      label: 'Email',
      render: (email: string) => (
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-slate-400" />
          <span className="truncate">{email}</span>
        </div>
      ),
    },
    {
      key: 'telefone' as const,
      label: 'Telefone',
      render: (phone: string) => (
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-slate-400" />
          {formatPhone(phone)}
        </div>
      ),
    },
    {
      key: 'tipo' as const,
      label: 'Tipo',
      render: (type: string) => (
        <span className="badge badge-info">
          {type === 'pessoa_fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
        </span>
      ),
    },
    {
      key: 'data_cadastro' as const,
      label: 'Data Cadastro',
      render: (date: string) => formatDate(date),
    },
    {
      key: 'id' as const,
      label: 'Ações',
      render: (_: any, row: Cliente) => (
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
            <h1 className="text-3xl font-display font-bold text-slate-900">Clientes</h1>
            <p className="text-slate-600 mt-1">Gerenciamento de clientes do sistema</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Novo Cliente
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6">
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <option value="pessoa_fisica">Pessoa Física</option>
                    <option value="pessoa_juridica">Pessoa Jurídica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    CPF/CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="input-field"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    maxLength={2}
                    className="input-field"
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
                  {editingClient ? 'Atualizar' : 'Criar'} Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar Cliente"
        message="Tem certeza que deseja deletar este cliente? Esta ação não pode ser desfeita."
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

export default Clientes
