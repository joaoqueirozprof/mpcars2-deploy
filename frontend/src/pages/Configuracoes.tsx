import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import toast from 'react-hot-toast'

const Configuracoes: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'empresa' | 'user' | 'system'>('empresa')
  const [empresaForm, setEmpresaForm] = useState({
    nome: 'MPCARS Brasil',
    cnpj: '00.000.000/0000-00',
    telefone: '(11) 9999-9999',
    email: 'contato@mpcars.com.br',
    endereco: 'Rua Principal, 123',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234-567',
  })

  const [userForm, setUserForm] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    role: user?.role || '',
  })

  const [systemForm, setSystemForm] = useState({
    idioma: 'pt-BR',
    tema: 'light',
    notificacoes_email: true,
    notificacoes_sms: false,
    valor_diaria_padrao: 150,
    taxa_juros: 2,
  })

  const handleSaveEmpresa = () => {
    toast.success('Configurações da empresa salvas com sucesso!')
  }

  const handleSaveUser = () => {
    toast.success('Dados do usuário atualizados com sucesso!')
  }

  const handleSaveSystem = () => {
    toast.success('Configurações do sistema salvas com sucesso!')
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-600 mt-1">Gerencie as configurações do sistema</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {['empresa', 'user', 'system'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'empresa' && 'Empresa'}
              {tab === 'user' && 'Usuário'}
              {tab === 'system' && 'Sistema'}
            </button>
          ))}
        </div>

        {/* Empresa Tab */}
        {activeTab === 'empresa' && (
          <div className="card max-w-2xl">
            <h2 className="text-lg font-display font-bold text-slate-900 mb-6">Dados da Empresa</h2>

            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nome</label>
                  <input
                    type="text"
                    value={empresaForm.nome}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, nome: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">CNPJ</label>
                  <input
                    type="text"
                    value={empresaForm.cnpj}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, cnpj: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={empresaForm.email}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, email: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={empresaForm.telefone}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, telefone: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Endereço</label>
                  <input
                    type="text"
                    value={empresaForm.endereco}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, endereco: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cidade</label>
                  <input
                    type="text"
                    value={empresaForm.cidade}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, cidade: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
                  <input
                    type="text"
                    value={empresaForm.estado}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, estado: e.target.value })}
                    maxLength={2}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">CEP</label>
                  <input
                    type="text"
                    value={empresaForm.cep}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, cep: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveEmpresa}
                className="btn-primary"
              >
                Salvar Configurações
              </button>
            </form>
          </div>
        )}

        {/* User Tab */}
        {activeTab === 'user' && (
          <div className="card max-w-2xl">
            <h2 className="text-lg font-display font-bold text-slate-900 mb-6">Dados do Usuário</h2>

            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome</label>
                <input
                  type="text"
                  value={userForm.nome}
                  onChange={(e) => setUserForm({ ...userForm, nome: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Função</label>
                <input
                  type="text"
                  value={userForm.role}
                  disabled
                  className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">A função não pode ser alterada aqui</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Alterar Senha</label>
                <input
                  type="password"
                  placeholder="Digite a nova senha"
                  className="input-field"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveUser}
                className="btn-primary"
              >
                Atualizar Dados
              </button>
            </form>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="card max-w-2xl">
            <h2 className="text-lg font-display font-bold text-slate-900 mb-6">Configurações do Sistema</h2>

            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Idioma</label>
                  <select
                    value={systemForm.idioma}
                    onChange={(e) => setSystemForm({ ...systemForm, idioma: e.target.value })}
                    className="input-field"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (USA)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tema</label>
                  <select
                    value={systemForm.tema}
                    onChange={(e) => setSystemForm({ ...systemForm, tema: e.target.value })}
                    className="input-field"
                  >
                    <option value="light">Claro</option>
                    <option value="dark">Escuro</option>
                    <option value="auto">Automático</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Valor Diária Padrão</label>
                  <input
                    type="number"
                    value={systemForm.valor_diaria_padrao}
                    onChange={(e) => setSystemForm({ ...systemForm, valor_diaria_padrao: parseFloat(e.target.value) })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Taxa de Juros (%)</label>
                  <input
                    type="number"
                    value={systemForm.taxa_juros}
                    onChange={(e) => setSystemForm({ ...systemForm, taxa_juros: parseFloat(e.target.value) })}
                    step="0.01"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemForm.notificacoes_email}
                    onChange={(e) => setSystemForm({ ...systemForm, notificacoes_email: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-slate-700">Receber notificações por Email</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemForm.notificacoes_sms}
                    onChange={(e) => setSystemForm({ ...systemForm, notificacoes_sms: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-slate-700">Receber notificações por SMS</span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleSaveSystem}
                className="btn-primary"
              >
                Salvar Configurações
              </button>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default Configuracoes
