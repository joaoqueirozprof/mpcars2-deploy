import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Edit, Key, UserCheck, UserX, Search,
  Shield, Eye, Clock, User as UserIcon, Activity,
  CheckSquare, Square, ChevronDown, Loader, RefreshCw,
  X
} from 'lucide-react'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout'
import toast from 'react-hot-toast'

const ALL_PAGES = [
  { slug: 'dashboard', label: 'Dashboard' },
  { slug: 'clientes', label: 'Clientes' },
  { slug: 'veiculos', label: 'Veiculos' },
  { slug: 'contratos', label: 'Contratos' },
  { slug: 'empresas', label: 'Empresas' },
  { slug: 'financeiro', label: 'Financeiro' },
  { slug: 'seguros', label: 'Seguros' },
  { slug: 'ipva', label: 'Licenciamento' },
  { slug: 'multas', label: 'Multas' },
  { slug: 'manutencoes', label: 'Manutencoes' },
  { slug: 'reservas', label: 'Reservas' },
  { slug: 'despesas-loja', label: 'Despesas Loja' },
  { slug: 'relatorios', label: 'Relatorios' },
  { slug: 'configuracoes', label: 'Configuracoes' },
]

interface UsuarioType {
  id: number
  nome: string
  email: string
  perfil: string
  ativo: boolean
  permitted_pages: string[]
  data_cadastro: string | null
}

interface ActivityLogType {
  id: number
  usuario_id: number | null
  usuario_nome: string | null
  usuario_email: string | null
  acao: string | null
  recurso: string | null
  recurso_id: number | null
  descricao: string | null
  ip_address: string | null
  timestamp: string | null
}

const Usuarios: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'usuarios' | 'logs'>('usuarios')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isResetModal, setIsResetModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UsuarioType | null>(null)
  const [resetUserId, setResetUserId] = useState<number | null>(null)
  const [resetUserName, setResetUserName] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Filters for logs
  const [logUsuarioId, setLogUsuarioId] = useState<string>('')
  const [logAcao, setLogAcao] = useState<string>('')
  const [logDataInicio, setLogDataInicio] = useState<string>('')
  const [logDataFim, setLogDataFim] = useState<string>('')

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    perfil: 'user',
    permitted_pages: [] as string[],
  })

  // === Queries ===
  const { data: usuarios = [], isLoading: loadingUsers } = useQuery<UsuarioType[]>({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const res = await api.get('/usuarios/')
      return res.data
    },
  })

  const { data: logs = [], isLoading: loadingLogs } = useQuery<ActivityLogType[]>({
    queryKey: ['activity-logs', logUsuarioId, logAcao, logDataInicio, logDataFim],
    queryFn: async () => {
      const params: any = { limit: 100 }
      if (logUsuarioId) params.usuario_id = logUsuarioId
      if (logAcao) params.acao = logAcao
      if (logDataInicio) params.data_inicio = logDataInicio
      if (logDataFim) params.data_fim = logDataFim
      const res = await api.get('/usuarios/logs', { params })
      return res.data
    },
    enabled: activeTab === 'logs',
  })

  // === Mutations ===
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/usuarios/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      closeModal()
      toast.success('Usuario criado com sucesso!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erro ao criar usuario')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/usuarios/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      closeModal()
      toast.success('Usuario atualizado com sucesso!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erro ao atualizar usuario')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/usuarios/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success('Status alterado!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erro ao alterar status')
    },
  })

  const resetSenhaMutation = useMutation({
    mutationFn: ({ id, nova_senha }: { id: number; nova_senha: string }) =>
      api.post(`/usuarios/${id}/reset-senha`, { nova_senha }),
    onSuccess: () => {
      setIsResetModal(false)
      setNovaSenha('')
      toast.success('Senha alterada com sucesso!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erro ao resetar senha')
    },
  })

  // === Helpers ===
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
    setFormData({ nome: '', email: '', password: '', perfil: 'user', permitted_pages: [] })
  }

  const openCreate = () => {
    setEditingUser(null)
    setFormData({ nome: '', email: '', password: '', perfil: 'user', permitted_pages: [] })
    setIsModalOpen(true)
  }

  const openEdit = (user: UsuarioType) => {
    setEditingUser(user)
    setFormData({
      nome: user.nome,
      email: user.email,
      password: '',
      perfil: user.perfil,
      permitted_pages: user.permitted_pages || [],
    })
    setIsModalOpen(true)
  }

  const openResetSenha = (user: UsuarioType) => {
    setResetUserId(user.id)
    setResetUserName(user.nome)
    setNovaSenha('')
    setIsResetModal(true)
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let pw = ''
    for (let i = 0; i < 8; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length))
    setNovaSenha(pw)
  }

  const togglePage = (slug: string) => {
    setFormData(prev => ({
      ...prev,
      permitted_pages: prev.permitted_pages.includes(slug)
        ? prev.permitted_pages.filter(p => p !== slug)
        : [...prev.permitted_pages, slug]
    }))
  }

  const selectAllPages = () => {
    const allSlugs = ALL_PAGES.map(p => p.slug)
    setFormData(prev => ({
      ...prev,
      permitted_pages: prev.permitted_pages.length === allSlugs.length ? [] : allSlugs
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingUser) {
      const updateData: any = {
        nome: formData.nome,
        email: formData.email,
        perfil: formData.perfil,
        permitted_pages: formData.permitted_pages,
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData })
    } else {
      if (!formData.password) {
        toast.error('Senha e obrigatoria para novo usuario')
        return
      }
      createMutation.mutate(formData)
    }
  }

  const filteredUsers = usuarios.filter(u =>
    u.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    try {
      return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    } catch { return d }
  }

  const acaoColor = (acao: string | null) => {
    switch (acao) {
      case 'LOGIN': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'CRIAR': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'EDITAR': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'EXCLUIR': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Gerenciamento de Usuarios</h1>
            <p className="text-sm text-muted mt-1">Controle de acesso e permissoes do sistema</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-alt rounded-lg p-1">
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'usuarios'
                ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Shield size={16} />
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Activity size={16} />
            Logs de Atividade
          </button>
        </div>

        {/* TAB: Usuarios */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <Plus size={18} />
                Novo Usuario
              </button>
            </div>

            {/* Table */}
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-primary" size={32} />
              </div>
            ) : (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-surface-alt border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Nome</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Perfil</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase">Paginas</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Cadastro</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase">Acoes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-surface-alt/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <UserIcon size={16} className="text-primary" />
                              </div>
                              <span className="text-sm font-medium text-foreground">{user.nome}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              user.perfil === 'admin'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              <Shield size={12} />
                              {user.perfil === 'admin' ? 'Admin' : 'Usuario'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm text-muted">
                              {user.perfil === 'admin' ? 'Todas' : `${(user.permitted_pages || []).length}/${ALL_PAGES.length}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              user.ativo
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {user.ativo ? <UserCheck size={12} /> : <UserX size={12} />}
                              {user.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted">{formatDate(user.data_cadastro)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEdit(user)}
                                title="Editar"
                                className="p-1.5 rounded-lg hover:bg-surface-alt text-muted hover:text-primary transition-colors"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => openResetSenha(user)}
                                title="Resetar senha"
                                className="p-1.5 rounded-lg hover:bg-surface-alt text-muted hover:text-yellow-600 transition-colors"
                              >
                                <Key size={16} />
                              </button>
                              <button
                                onClick={() => toggleMutation.mutate(user.id)}
                                title={user.ativo ? 'Desativar' : 'Ativar'}
                                className={`p-1.5 rounded-lg hover:bg-surface-alt transition-colors ${
                                  user.ativo ? 'text-muted hover:text-red-600' : 'text-muted hover:text-green-600'
                                }`}
                              >
                                {user.ativo ? <UserX size={16} /> : <UserCheck size={16} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-muted text-sm">
                            Nenhum usuario encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={logUsuarioId}
                onChange={(e) => setLogUsuarioId(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">Todos os usuarios</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
              <select
                value={logAcao}
                onChange={(e) => setLogAcao(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">Todas as acoes</option>
                <option value="LOGIN">Login</option>
                <option value="CRIAR">Criar</option>
                <option value="EDITAR">Editar</option>
                <option value="EXCLUIR">Excluir</option>
              </select>
              <input
                type="date"
                value={logDataInicio}
                onChange={(e) => setLogDataInicio(e.target.value)}
                placeholder="Data inicio"
                className="px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              <input
                type="date"
                value={logDataFim}
                onChange={(e) => setLogDataFim(e.target.value)}
                placeholder="Data fim"
                className="px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            {/* Logs Table */}
            {loadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-primary" size={32} />
              </div>
            ) : (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-surface-alt border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Data/Hora</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Usuario</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase">Acao</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Recurso</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Descricao</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-surface-alt/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">{formatDate(log.timestamp)}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{log.usuario_nome || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${acaoColor(log.acao)}`}>
                              {log.acao || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted">{log.recurso || '-'}</td>
                          <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate">{log.descricao || '-'}</td>
                          <td className="px-4 py-3 text-xs text-muted font-mono">{log.ip_address || '-'}</td>
                        </tr>
                      ))}
                      {logs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-muted text-sm">
                            Nenhum log encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Criar/Editar Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-display font-bold text-foreground">
                {editingUser ? 'Editar Usuario' : 'Novo Usuario'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-alt text-muted">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Senha inicial do usuario"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Perfil</label>
                <select
                  value={formData.perfil}
                  onChange={(e) => setFormData(prev => ({ ...prev, perfil: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {formData.perfil !== 'admin' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">Permissoes de Paginas</label>
                    <button
                      type="button"
                      onClick={selectAllPages}
                      className="text-xs text-primary hover:underline"
                    >
                      {formData.permitted_pages.length === ALL_PAGES.length ? 'Desmarcar todas' : 'Selecionar todas'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                    {ALL_PAGES.map((page) => (
                      <label
                        key={page.slug}
                        className="flex items-center gap-2 cursor-pointer hover:bg-surface-alt rounded px-2 py-1.5 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.permitted_pages.includes(page.slug)}
                          onChange={() => togglePage(page.slug)}
                          className="rounded border-border text-primary focus:ring-primary/20"
                        />
                        <span className="text-sm text-foreground">{page.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {formData.permitted_pages.length} de {ALL_PAGES.length} paginas selecionadas
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-surface-alt transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader className="animate-spin mx-auto" size={18} />
                  ) : editingUser ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Resetar Senha */}
      {isResetModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-display font-bold text-foreground">Resetar Senha</h2>
              <button onClick={() => setIsResetModal(false)} className="p-1 rounded-lg hover:bg-surface-alt text-muted">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-muted">
                Resetar a senha do usuario <strong className="text-foreground">{resetUserName}</strong>
              </p>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nova Senha</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Digite a nova senha"
                    className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    title="Gerar senha aleatoria"
                    className="px-3 py-2.5 rounded-lg border border-border text-muted hover:bg-surface-alt transition-colors"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsResetModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-surface-alt transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!novaSenha.trim()) { toast.error('Digite uma senha'); return }
                    if (resetUserId) resetSenhaMutation.mutate({ id: resetUserId, nova_senha: novaSenha })
                  }}
                  disabled={resetSenhaMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {resetSenhaMutation.isPending ? (
                    <Loader className="animate-spin mx-auto" size={18} />
                  ) : 'Resetar Senha'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

export default Usuarios
